/* EducaRuta · asistente virtual demostrativo
   Respuestas preparadas. No utiliza IA ni envía datos a ningún servicio. */
(function () {
  "use strict";
  function iniciarAsistente() {
    if (document.getElementById("er-chat-launcher")) return;

    const preguntas = [
      {
        texto: "¿Qué es EducaRuta?",
        claves: ["que es", "educaruta", "proyecto"],
        respuesta: "EducaRuta es una plataforma de información sobre oportunidades educativas para niños, niñas y jóvenes con discapacidad. Busca ayudar a las familias a explorar instituciones y servicios disponibles."
      },
      {
        texto: "¿Cómo busco una institución?",
        claves: ["buscar", "busco", "encontrar", "institucion", "institución", "municipio", "departamento"],
        respuesta: "En la sección «Buscar oportunidades», puedes elegir un departamento y un municipio, seleccionar el tipo de centro o escribir una palabra relacionada con el nombre o los servicios. Después revisa las fichas y confirma la información con la institución antes de acudir."
      },
      {
        texto: "¿Qué tipos de centros puedo encontrar?",
        claves: ["tipo", "tipos", "centro", "centros", "escuela", "especializada", "inclusiva", "organizacion", "organización"],
        respuesta: "EducaRuta organiza las opciones en tres categorías: educación especializada, escuelas inclusivas y centros de apoyo. La disponibilidad de información depende de los registros que se han incorporado a la plataforma."
      },
      {
        texto: "¿Cómo contacto con una escuela?",
        claves: ["contacto", "contactar", "escribir", "whatsapp", "llamar", "mensaje"],
        respuesta: "Abre la ficha de una institución y pulsa «Escribir a la escuela». El formulario guarda la solicitud en EducaRuta y luego te muestra opciones para continuar. Actualmente, el sitio no envía el mensaje automáticamente a la institución: debes continuar por WhatsApp, si está disponible, o llamar al centro."
      },
      {
        texto: "¿Qué hago si no encuentro una institución?",
        claves: ["no encuentro", "no hay", "no aparece", "no encuentro", "ayuda", "otra opcion", "otra opción"],
        respuesta: "Prueba con otro municipio, elimina alguno de los filtros o busca con una palabra más general. Si no aparece una opción, eso no significa necesariamente que no exista un servicio: la información de la plataforma todavía puede estar incompleta."
      },
      {
        texto: "¿El asistente ya usa inteligencia artificial?",
        claves: ["inteligencia artificial", "robot", "automatico", "automático", "conectado"],
        respuesta: "Esta es una versión demostrativa de EducaRuta. Por ahora utiliza respuestas preparadas y no está conectada a inteligencia artificial. El equipo trabaja con la visión de incorporar esa conexión en una próxima etapa."
      }
    ];

    const boton = document.createElement("button");
    boton.type = "button";
    boton.id = "er-chat-launcher";
    boton.className = "er-chat-launcher";
    boton.setAttribute("aria-label", "Abrir asistente demostrativo de EducaRuta");
    boton.setAttribute("aria-expanded", "false");
    boton.innerHTML = '<span class="er-chat-launcher-icon" aria-hidden="true">▢</span><span class="er-chat-launcher-label">¿Necesitás ayuda?</span>';

    const panel = document.createElement("section");
    panel.id = "er-chat-panel";
    panel.className = "er-chat-panel";
    panel.hidden = true;
    panel.setAttribute("aria-label", "Asistente virtual demostrativo");
    panel.innerHTML = `
      <div class="er-chat-header">
        <div class="er-chat-avatar" aria-hidden="true">E</div>
        <div class="er-chat-heading"><strong>Asistente EducaRuta</strong><span><i></i> Versión demostrativa</span></div>
        <button type="button" class="er-chat-close" aria-label="Cerrar asistente">×</button>
      </div>
      <div class="er-chat-notice">Esta demostración utiliza respuestas preparadas. La conexión con inteligencia artificial está en desarrollo.</div>
      <div class="er-chat-messages" id="er-chat-messages" aria-live="polite" aria-relevant="additions">
        <div class="er-chat-bubble er-chat-bot">¡Hola! 👋 Soy el asistente demostrativo de EducaRuta. Puedo orientarte sobre cómo usar la plataforma.</div>
        <p class="er-chat-prompts-title">Puedes elegir una pregunta:</p>
        <div class="er-chat-prompts" id="er-chat-prompts"></div>
      </div>
      <form class="er-chat-form" id="er-chat-form">
        <label class="er-chat-sr" for="er-chat-input">Escribe tu pregunta</label>
        <input id="er-chat-input" type="text" maxlength="240" placeholder="Escribí tu pregunta…" autocomplete="off">
        <button type="submit" aria-label="Enviar pregunta" title="Enviar pregunta">➤</button>
      </form>
      <div class="er-chat-footer">Prototipo · Sin conexión a IA</div>`;

    document.body.append(boton, panel);
    const cerrar = panel.querySelector(".er-chat-close");
    const mensajes = panel.querySelector("#er-chat-messages");
    const prompts = panel.querySelector("#er-chat-prompts");
    const formulario = panel.querySelector("#er-chat-form");
    const entrada = panel.querySelector("#er-chat-input");

    function abrir() {
      panel.hidden = false;
      boton.setAttribute("aria-expanded", "true");
      boton.setAttribute("aria-label", "Cerrar asistente demostrativo de EducaRuta");
      boton.classList.add("er-chat-launcher-open");
      entrada.focus();
    }
    function cerrarPanel() {
      panel.hidden = true;
      boton.setAttribute("aria-expanded", "false");
      boton.setAttribute("aria-label", "Abrir asistente demostrativo de EducaRuta");
      boton.classList.remove("er-chat-launcher-open");
      boton.focus();
    }
    function agregarMensaje(texto, tipo) {
      const el = document.createElement("div");
      el.className = "er-chat-bubble " + (tipo === "usuario" ? "er-chat-user" : "er-chat-bot");
      el.textContent = texto;
      mensajes.appendChild(el);
      mensajes.scrollTop = mensajes.scrollHeight;
    }
    function responder(pregunta) {
      agregarMensaje(pregunta, "usuario");
      const normal = pregunta.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const coincidencia = preguntas.find(item =>
        item.claves.some(clave => normal.includes(clave.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()))
      );
      const respuesta = coincidencia
        ? coincidencia.respuesta
        : "Gracias por tu pregunta. En esta versión demostrativa todavía solo puedo responder algunas consultas preparadas. Puedes elegir una de las preguntas sugeridas o explorar la sección «Buscar oportunidades». La conexión con inteligencia artificial está prevista para una próxima etapa.";
      window.setTimeout(() => agregarMensaje(respuesta, "bot"), 180);
    }

    preguntas.forEach(item => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "er-chat-prompt";
      b.textContent = item.texto;
      b.addEventListener("click", () => responder(item.texto));
      prompts.appendChild(b);
    });
    boton.addEventListener("click", () => panel.hidden ? abrir() : cerrarPanel());
    cerrar.addEventListener("click", cerrarPanel);
    formulario.addEventListener("submit", evento => {
      evento.preventDefault();
      const texto = entrada.value.trim();
      if (!texto) { entrada.focus(); return; }
      responder(texto);
      entrada.value = "";
    });
    document.addEventListener("keydown", evento => {
      if (evento.key === "Escape" && !panel.hidden) cerrarPanel();
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciarAsistente);
  else iniciarAsistente();
})();