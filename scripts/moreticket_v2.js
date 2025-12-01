/**
 * moreticket for ITSM-NG v2
 *
 * @param  options
 */
(function ($) {
    $.fn.moreticket_v2 = function (options) {

        var object = this;
        init();

        /**
         * Start the plugin
         */
        function init() {
            object.params = new Array();
            object.params['lang'] = '';
            object.params['root_doc'] = '';

            object.countSubmit = 0;

            if (options !== undefined) {
                $.each(options, function (index, val) {
                    if (val != undefined && val != null) {
                        object.params[index] = val;
                    }
                });
            }
        }

        /**
         * moreticket_injectWaitingTicket - Main entry point for v2
         */
        this.moreticket_injectWaitingTicket = function () {
            // On UPDATE/ADD side
            $(document).ready(function () {
                var tickets_id = object.urlParam(window.location.href, 'id');
                // only in ticket form
                if (location.pathname.indexOf('front/ticket.form.php') > 0
                    && (object.params.use_solution || object.params.use_waiting || object.params.use_question)) {

                    if (tickets_id == 0 || tickets_id == undefined) {
                        setTimeout(function () {
                            object.createTicket(tickets_id);
                        }, 100);
                    } else {
                        // For v2, wait for page load then inject
                        setTimeout(function () {
                            object.updateTicket(tickets_id);
                        }, 300);
                    }

                    // Monitor AJAX requests for timeline/followup forms
                    object.setupTimelineObserver(tickets_id);
                }
            });
        };

        /**
         * Setup observer for timeline AJAX requests (followups, tasks, etc.)
         */
        this.setupTimelineObserver = function (tickets_id) {            
            // Use a polling approach to detect new _status selects
            // This is more reliable than MutationObserver for dynamically loaded forms
            var checkInterval = setInterval(function() {
                var statusSelects = $("select[name='_status']");
                statusSelects.each(function() {
                    if (!$(this).attr('data-moreticket-processed')) {
                        object.injectBlocWaitingFollowup(tickets_id, $(this));
                    }
                });
            }, 500);

            // Also use ajaxComplete as a backup trigger
            $(document).ajaxComplete(function (event, xhr, option) {
                if (option.url != undefined) {
                    // Handle timeline.php requests (followups, tasks, solutions)
                    if (option.url.indexOf("ajax/timeline.php") > 0 ||
                        option.url.indexOf("ajax/viewsubitem.php") > 0) {
                        // Add a slight delay to let the DOM update
                        setTimeout(function() {
                            var statusSelect = $("select[name='_status']").not('[data-moreticket-processed]').first();
                            if (statusSelect.length > 0) {
                                object.injectBlocWaitingFollowup(tickets_id, statusSelect);
                            }
                        }, 200);
                    }
                }
            });
        };

        //################## On ADD side ################################################################

        /**
         * createTicket - Inject waiting ticket form for new tickets
         */
        this.createTicket = function (tickets_id) {
            $.ajax({
                url: object.params.root_doc + '/ajax/ticket.php',
                data: {'tickets_id': tickets_id, 'action': 'showFormV2', 'type': 'add'},
                type: "POST",
                dataType: "html",
                success: function (response, opts) {
                    var requester = response;

                    // V2: Find status select using name attribute
                    var status_bloc = $("select[name='status']");

                    if (status_bloc !== undefined && status_bloc.length > 0) {
                        // V2: Find the wrapper div (col-lg-4 parent)
                        var wrapper = status_bloc.closest('div[class*="col-"]');
                        
                        // Insert after the wrapper
                        wrapper.after(requester);

                        object.setupStatusToggle(status_bloc);
                    }
                }
            });
        };

        //################## On UPDATE side ################################################################

        /**
         * updateTicket - Inject waiting ticket form for existing tickets
         *
         * @param tickets_id
         */
        this.updateTicket = function (tickets_id) {
            $.ajax({
                url: object.params.root_doc + '/ajax/ticket.php',
                data: {'tickets_id': tickets_id, 'action': 'showFormV2', 'type': 'update'},
                type: "POST",
                dataType: "html",
                success: function (response, opts) {
                    // Remove any existing injected content
                    if ($("#moreticket_waiting_ticket").length != 0) {
                        $("#moreticket_waiting_ticket").remove();
                    }
                    if ($("#moreticket_close_ticket").length != 0) {
                        $("#moreticket_close_ticket").remove();
                    }

                    var requester = response;

                    // Find status select using name attribute
                    var status_bloc = $("select[name='status']");

                    if (status_bloc != undefined && status_bloc.length > 0) {
                        // Find the wrapper div (col-lg-4 parent)
                        var wrapper = status_bloc.closest('div[class*="col-"]');
                        
                        // Insert after the wrapper
                        wrapper.after(requester);

                        object.setupStatusToggle(status_bloc);
                    }
                }
            });
        };

        /**
         * Setup show/hide toggle based on status value
         */
        this.setupStatusToggle = function (status_bloc) {
            // ON DISPLAY : Display or hide waiting type
            if ($("#moreticket_waiting_ticket") != undefined && $("#moreticket_close_ticket") != undefined) {

                // WAITING TICKET
                if (status_bloc.val() == object.params.waiting && object.params.use_waiting) {
                    $("#moreticket_waiting_ticket").css({'display': 'block'});
                } else {
                    $("#moreticket_waiting_ticket").css({'display': 'none'});
                }

                // CLOSE TICKET
                var show_solution = false;
                if (object.params.solution_status != null && object.params.solution_status != '') {
                    $.each($.parseJSON(object.params.solution_status), function (index, val) {
                        if (index == status_bloc.val()) {
                            show_solution = true;
                        }
                    });
                }
                if (show_solution && object.params.use_solution) {
                    $("#moreticket_close_ticket").css({'display': 'block'});
                } else {
                    $("#moreticket_close_ticket").css({'display': 'none'});
                }

                // ONCHANGE : Display or hide waiting type
                status_bloc.off('change.moreticket').on('change.moreticket', function () {
                    // WAITING TICKET
                    if (status_bloc.val() == object.params.waiting && object.params.use_waiting) {
                        $("#moreticket_waiting_ticket").css({'display': 'block'});
                    } else {
                        $("#moreticket_waiting_ticket").css({'display': 'none'});
                    }

                    // CLOSE TICKET
                    var show_solution = false;
                    if (object.params.solution_status != null && object.params.solution_status != '') {
                        $.each($.parseJSON(object.params.solution_status), function (index, val) {
                            if (index == status_bloc.val()) {
                                show_solution = true;
                            }
                        });
                    }
                    if (show_solution && object.params.use_solution) {
                        $("#moreticket_close_ticket").css({'display': 'block'});
                    } else {
                        $("#moreticket_close_ticket").css({'display': 'none'});
                    }
                });
            }
        };

        /**
         * injectBlocWaitingFollowup - Inject waiting ticket form in followup/task forms
         *
         * @param tickets_id
         * @param statusSelect (optional) - jQuery element of the status select
         */
        this.injectBlocWaitingFollowup = function (tickets_id, statusSelect) {
            // Check if we already have the form injected
            if ($("#moreticket_waiting_ticket_followup").length != 0) {
                return;
            }

            // V2: Use provided select or search for _status select in followup forms
            var status_bloc_followup = statusSelect || null;
            
            if (!status_bloc_followup) {
                $("select[name='_status']").each(function() {
                    // Check if this select is not already processed (using attr for DOM attribute)
                    if (!$(this).attr('data-moreticket-processed')) {
                        status_bloc_followup = $(this);
                        return false; // break the loop
                    }
                });
            }

            if (status_bloc_followup == null || status_bloc_followup.length == 0) {
                return;
            }

            // Mark as processed to avoid duplicate injections (using attr for DOM attribute)
            status_bloc_followup.attr('data-moreticket-processed', 'true');
            
            // Inject the waiting ticket form
            $.ajax({
                url: object.params.root_doc + '/ajax/ticket.php',
                data: {'tickets_id': tickets_id, 'action': 'showFormFollowupV2', 'type': 'update'},
                type: "POST",
                dataType: "html",
                success: function (response, opts) {                    
                    // Remove any existing injected content
                    if ($("#moreticket_waiting_ticket_followup").length != 0) {
                        $("#moreticket_waiting_ticket_followup").remove();
                    }
                    if ($("#isQuestion").length != 0) {
                        $("#isQuestion").remove();
                    }

                    var requester = response;

                    // Try multiple strategies to find the right place to insert
                    var inserted = false;

                    // Find the wrapper div for the status select (col-* class)
                    var wrapper = status_bloc_followup.closest('div[class*="col-"]');
                    if (wrapper.length > 0) {
                        wrapper.after(requester);
                        inserted = true;
                    }
                   
                    if (!inserted) {
                        var form = status_bloc_followup.closest('form');
                        if (form.length > 0) {
                            form.find('.form-section-content').first().append(requester);
                        }
                    }

                    // Setup show/hide based on status value
                    object.setupFollowupStatusToggle(status_bloc_followup);
                }
            });
        };

        /**
         * Setup show/hide toggle for followup status
         */
        this.setupFollowupStatusToggle = function (status_bloc) {
            // ON DISPLAY : Display or hide waiting type
            if ($("#moreticket_waiting_ticket_followup").length > 0) {
                // WAITING TICKET - status 4 is WAITING
                if (status_bloc.val() == object.params.waiting && object.params.use_waiting) {
                    $("#moreticket_waiting_ticket_followup").css({
                        'display': 'block',
                        'clear': 'both',
                        'text-align': 'center'
                    });
                } else {
                    $("#moreticket_waiting_ticket_followup").css({'display': 'none'});
                }

                // ONCHANGE : Display or hide waiting type
                status_bloc.off('change.moreticket').on('change.moreticket', function () {
                    if (status_bloc.val() == object.params.waiting && object.params.use_waiting) {
                        $("#moreticket_waiting_ticket_followup").css({
                            'display': 'block',
                            'clear': 'both',
                            'text-align': 'center'
                        });
                    } else {
                        $("#moreticket_waiting_ticket_followup").css({'display': 'none'});
                    }
                });
            }
        };

        /**
         * moreticket_urgency - Handle urgency field injection
         */
        this.moreticket_urgency = function () {
            $(document).ready(function () {
                var tickets_id = object.urlParam(window.location.href, 'id');
                
                if ((location.pathname.indexOf('front/ticket.form.php') > 0
                    || location.pathname.indexOf('helpdesk.public.php') > 0
                    || location.pathname.indexOf('tracking.injector.php') > 0)
                    && object.params.use_urgency) {
                    
                    if (tickets_id == 0 || tickets_id == undefined) {
                        object.createTicket_urgency(tickets_id);
                    } else {
                        setTimeout(function() {
                            object.updateTicket_urgency(tickets_id);
                        }, 300);
                    }
                }
            });
        };

        this.createTicket_urgency = function (tickets_id) {
            $.ajax({
                url: object.params.root_doc + '/ajax/ticket.php',
                data: {'tickets_id': tickets_id, 'action': 'showFormUrgencyV2', 'type': 'add'},
                type: "POST",
                dataType: "html",
                success: function (response, opts) {
                    var requester = response;

                    // V2: Find urgency select
                    var urgency_bloc = $("select[name='urgency']");

                    if (urgency_bloc != undefined && urgency_bloc.length > 0) {
                        var wrapper = urgency_bloc.closest('div[class*="col-"]');
                        wrapper.after(requester);

                        object.setupUrgencyToggle(urgency_bloc);
                    }
                }
            });
        };

        this.updateTicket_urgency = function (tickets_id) {
            $.ajax({
                url: object.params.root_doc + '/ajax/ticket.php',
                data: {'tickets_id': tickets_id, 'action': 'showFormUrgencyV2', 'type': 'update'},
                type: "POST",
                dataType: "html",
                success: function (response, opts) {
                    if ($("#moreticket_urgency_ticket").length != 0) {
                        $("#moreticket_urgency_ticket").remove();
                    }
                    var requester = response;

                    var urgency_bloc = $("select[name='urgency']");

                    if (urgency_bloc != undefined && urgency_bloc.length > 0) {
                        var wrapper = urgency_bloc.closest('div[class*="col-"]');
                        wrapper.after(requester);

                        object.setupUrgencyToggle(urgency_bloc);
                    }
                }
            });
        };

        this.setupUrgencyToggle = function (urgency_bloc) {
            if ($("#moreticket_urgency_ticket") != undefined) {
                // URGENCY TICKET
                if (inarray(urgency_bloc.val(), object.params.urgency_ids) && object.params.use_urgency) {
                    $("#moreticket_urgency_ticket").css({'display': 'block'});
                } else {
                    $("#moreticket_urgency_ticket").css({'display': 'none'});
                }

                // ONCHANGE
                urgency_bloc.off('change.moreticket').on('change.moreticket', function () {
                    if (inarray(urgency_bloc.val(), object.params.urgency_ids) && object.params.use_urgency) {
                        $("#moreticket_urgency_ticket").css({'display': 'block'});
                    } else {
                        $("#moreticket_urgency_ticket").css({'display': 'none'});
                    }
                });
            }
        };

        /**
         * moreticket_solution - Handle solution duration injection
         */
        this.moreticket_solution = function () {
            $(document).ready(function () {
                if (location.pathname.indexOf('ticket.form.php') > 0) {
                    var tickets_id = object.urlParam(window.location.href, 'id');
                    if (tickets_id == undefined || tickets_id == 0) {
                        return;
                    }

                    // Monitor AJAX for solution forms
                    $(document).ajaxComplete(function (event, xhr, option) {
                        setTimeout(function () {
                            if (option.data != undefined) {
                                if (object.urlParam(option.data, 'type') == 'Solution'
                                    && (option.url.indexOf("ajax/timeline.php") != -1 || option.url.indexOf("ajax/viewsubitem.php") != -1)) {

                                    var solId = object.urlParam(option.data, '&id');

                                    if (solId == 0 || solId == undefined) {
                                        $.ajax({
                                            url: object.params.root_doc + '/ajax/ticket.php',
                                            type: "POST",
                                            dataType: "html",
                                            data: {
                                                'tickets_id': tickets_id,
                                                'action': 'showFormSolution'
                                            },
                                            success: function (response, opts) {
                                                // V2: Find appropriate insertion point
                                                var inputAdd;
                                                if (object.params.div_kb) {
                                                    inputAdd = $("select[name='_sol_to_kb']");
                                                } else {
                                                    inputAdd = $("select[id^='dropdown_solutiontypes_id']");
                                                }
                                                if (inputAdd.length == 0) {
                                                    inputAdd = $("select[name='solutiontypes_id']");
                                                }
                                                
                                                var wrapper = inputAdd.closest('div[class*="col-"]');
                                                if (wrapper.length > 0 && $("div[name='duration_solution']").length == 0) {
                                                    wrapper.after(response);
                                                }

                                                var scripts, scriptsFinder = /<script[^>]*>([\s\S]+?)<\/script>/gi;
                                                while (scripts = scriptsFinder.exec(response)) {
                                                    eval(scripts[1]);
                                                }
                                            }
                                        });
                                    }
                                }
                            }
                        }, 100);
                    }, this);
                }
            });
        };

        function inarray(value, tab) {
            var response = false;
            $.each(tab, function (key, value2) {
                if (value == value2) {
                    response = true;
                }
            });
            return response;
        }

        /**
         * Get url parameter
         *
         * @param string url
         * @param string name
         */
        this.urlParam = function (url, name) {
            var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(url);
            if (results == null || results == undefined) {
                return 0;
            }

            return results[1];
        };

        return this;
    }
}(jQuery));
