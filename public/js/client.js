$(document).ready(function () {
  function bbCodeFunction() {

    /**
     * Chip & Terrain Toggle.
     */
    $(".chipclick").unbind("click");
    $(".chipclick").click(function(event) {
      $(this).next().toggle();
      event.stopPropagation();
    });
    $(".chipbody, [class*=' bbcode-popup'], [class^='bbcode-popup']").unbind("click");
    $(".chipbody, [class*=' bbcode-popup'], [class^='bbcode-popup']").click(function(event) {
      event.stopPropagation();
    });

    /**
     * BBCode class toggle.
     */
    $("[class^='bbcode-click']").each(function() {
      $(this).attr('class').split(' ').forEach(cls => {
        let matcl = cls.match(/bbcode-click(.+?)$/);
        if(matcl && matcl[1]) {
          if ($(".bbcode-popup"+matcl[1]).length > 0) {
            $(".bbcode-click"+matcl[1]+", .bbcode-popup"+matcl[1]).wrapAll("<span class='bbcode-poppos'></span>");
          }
          $(".bbcode-click"+matcl[1]).unbind("click");
          $(".bbcode-click"+matcl[1]).css("cursor</li></ul>","pointer");
          $(".bbcode-click"+matcl[1]).click(function(event) {
            $(".bbcode-hide"+matcl[1]).toggle();
            $(".bbcode-popup"+matcl[1]).css('display',$(".bbcode-popup"+matcl[1]).css('display')==="none"?"block":"none");
            if ($(".bbcode-swap"+matcl[1]).length === 1 && $(".bbcode-click"+matcl[1]).length === 1) {
              $(".bbcode-click"+matcl[1]).replaceWith($(".bbcode-swap"+matcl[1]).clone(true));
              $(".bbcode-swap"+matcl[1]).eq(1).empty();
              $(".bbcode-swap"+matcl[1]).eq(0).show();
            }
            event.stopPropagation();
          });
        }
      });
    });

    /**
     * Spoiler Toggle.
     */
    $("div.spoiler-toggle").unbind("click");
    $("div.spoiler-toggle").click(function(event) {
      event.stopPropagation();
      $(this).next().toggle();
    });

    /**
     * Virus Tag Toggle.
     */
    $("span.vr-tag").unbind("click");
    $("span.vr-tag").click(function(event) {
      const virusName = $(this).attr('name');
      const virusData = $(this).next();
      if (virusData.hasClass('vr-tag-info')) {
        const vWindow = window.open("", "", "height=640,width=480");
        vWindow.document.write(`<title>${virusName}<\/title>`);
        vWindow.document.write("<\/head>");
        vWindow.document.write("<body style=\"background-color: #eeeeee; font-family: \'Inconsolata\', \'Helvetica\', \'Arial\', \'Bitstream Vera Sans\', \'Verdana\', sans-serif; font-size:93.3%;\">");
        vWindow.document.write(virusData.html());
        vWindow.document.write("<hr>");
        vWindow.document.write("<input type='button' value='Close' onclick='window.close()'>");
        vWindow.document.write("<\/body>");
        vWindow.document.write("<\/html>");
        vWindow.document.close(); 
      }
      event.stopPropagation();
    });
  }

  $(window).on('action:topic.loaded', bbCodeFunction);
  $(window).on('action:posts.loaded', bbCodeFunction);
  $(window).on('action:ajaxify.end', (_, data) => {
    if (data.tpl_url && data.tpl_url === 'account/profile') {
      bbCodeFunction();
    }
  });
  $(window).on('action:posts.edited', bbCodeFunction);
})