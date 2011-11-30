$(function() {
    register_live_click_handler('#unpaid', 'li.paid', 'li.unpaid');
    register_live_click_handler('#paid', 'li.unpaid', 'li.paid');

    function register_live_click_handler(selector, selector_to_hide, selector_to_show) {
        $(selector).live('click', function() {
            $(selector_to_hide).hide();
            $(selector_to_show).show();

            $.mobile.fixedToolbars.show(true);

            return false;
        });
    }
});