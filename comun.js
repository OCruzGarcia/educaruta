/* Accesibilidad y navegación principal de EducaRuta */
(function () {
  const raiz = document.documentElement;
  const CLAVE = "er";
  let opciones = { f: 18, c: false };

  try {
    const guardadas = JSON.parse(localStorage.getItem(CLAVE) || "{}");
    if (guardadas && typeof guardadas === "object") {
      const tamano = Number(guardadas.f);
      if (Number.isFinite(tamano)) opciones.f = Math.min(26, Math.max(17, tamano));
      opciones.c = guardadas.c === true;
    }
  } catch (e) {}

  function aplicar() {
    raiz.style.fontSize = opciones.f + "px";
    if (opciones.c) raiz.setAttribute("data-c", "alto");
    else raiz.removeAttribute("data-c");
  }

  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(opciones)); } catch (e) {}
  }

  function iniciar() {
    const botonLetra = document.getElementById("mas");
    const botonContraste = document.getElementById("con");
    const botonMenu = document.getElementById("menuBtn");
    const menu = document.getElementById("menuNav");

    if (botonLetra) {
      botonLetra.addEventListener("click", function () {
        opciones.f = opciones.f >= 26 ? 17 : Math.min(26, opciones.f + 3);
        aplicar(); guardar();
      });
    }
    if (botonContraste) {
      botonContraste.addEventListener("click", function () {
        opciones.c = !opciones.c; aplicar(); guardar();
        botonContraste.setAttribute("aria-pressed", String(opciones.c));
      });
      botonContraste.setAttribute("aria-pressed", String(opciones.c));
    }
    if (botonMenu && menu) {
      const cerrar = function () {
        menu.classList.remove("abierto");
        botonMenu.setAttribute("aria-expanded", "false");
        botonMenu.setAttribute("aria-label", "Abrir menú");
      };
      botonMenu.addEventListener("click", function () {
        const abierto = botonMenu.getAttribute("aria-expanded") === "true";
        if (abierto) cerrar();
        else {
          menu.classList.add("abierto");
          botonMenu.setAttribute("aria-expanded", "true");
          botonMenu.setAttribute("aria-label", "Cerrar menú");
        }
      });
      menu.querySelectorAll("a").forEach(function (enlace) {
        enlace.addEventListener("click", cerrar);
      });
      document.addEventListener("keydown", function (evento) {
        if (evento.key === "Escape") { cerrar(); botonMenu.focus(); }
      });
      document.addEventListener("click", function (evento) {
        if (!menu.contains(evento.target) && !botonMenu.contains(evento.target)) cerrar();
      });
    }
    const anio = document.getElementById("anio");
    if (anio) anio.textContent = String(new Date().getFullYear());
  }

  aplicar();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
