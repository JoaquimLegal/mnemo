/* mnemo — site interactions (zero dependencies) */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Reveal on scroll ---------- */
  var reveals = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach(function (el) {
      io.observe(el);
    });
  } else {
    reveals.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* ---------- Hero typing animation ---------- */
  if (!reduceMotion) {
    var typeLines = Array.prototype.slice.call(
      document.querySelectorAll(".terminal__body .type")
    );

    function typeLine(pre) {
      var rest = pre.querySelector(".rest");
      var text = rest.textContent;
      rest.textContent = "";
      var i = 0;

      return new Promise(function (resolve) {
        (function next() {
          if (i <= text.length) {
            rest.textContent = text.slice(0, i);
            i += 1;
            setTimeout(next, 38);
          } else {
            resolve();
          }
        })();
      });
    }

    (async function play() {
      for (var i = 0; i < typeLines.length; i++) {
        await typeLine(typeLines[i]);
      }
    })();
  }

  /* ---------- Copy buttons ---------- */
  var copies = Array.prototype.slice.call(document.querySelectorAll(".copy"));

  copies.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy") || "";
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
          flashCopied(btn);
        });
      } else {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
          flashCopied(btn);
        } catch (_) {
          /* ignore */
        }
        document.body.removeChild(ta);
      }
    });
  });

  function flashCopied(btn) {
    btn.setAttribute("data-copied", "");
    btn.textContent = "copied!";
    setTimeout(function () {
      btn.removeAttribute("data-copied");
      btn.textContent = "copy";
    }, 1600);
  }

  /* ---------- Active nav highlight ---------- */
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll(".nav__links a")
  );
  var sections = navLinks
    .map(function (a) {
      var id = a.getAttribute("href");
      return id && id.charAt(0) === "#"
        ? document.querySelector(id)
        : null;
    })
    .filter(Boolean);

  if ("IntersectionObserver" in window && sections.length) {
    var spy = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            navLinks.forEach(function (a) {
              a.style.color = "";
            });
            var id = entry.target.getAttribute("id");
            var link = navLinks.find(function (a) {
              return a.getAttribute("href") === "#" + id;
            });
            if (link) link.style.color = "var(--purple)";
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    sections.forEach(function (s) {
      spy.observe(s);
    });
  }
})();
