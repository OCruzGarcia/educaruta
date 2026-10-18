/* EducaRuta · buscador conectado a Supabase.
   Los datos de centros (departamentos, municipios, instituciones) son de solo lectura.
   Lo único que se escribe es la tabla "solicitudes" (solo inserción, definida por RLS). */
(function () {
  const $ = (id) => document.getElementById(id);
  const dep = $('dep'), mun = $('mun'), texto = $('texto'), tipo = $('tipo'), orden = $('orden');
  const lista = $('lista'), resumen = $('resumen'), vacio = $('vacio'), filtros = $('filtros');

  const nombresTipo = {especializada: 'Educación especializada', inclusiva: 'Escuela inclusiva', organizacion: 'Centro de apoyo'};
  const iconosTipo = {especializada: '⌂', inclusiva: '◎', organizacion: '♡'};
  const coloresTipo = {especializada: 'azul', inclusiva: 'verde', organizacion: 'lila'};
  const CATEGORIA = {educacion_especial: 'especializada', escuela_inclusiva: 'inclusiva', centro_apoyo: 'organizacion'};
  const SECTOR = {publica: 'Pública', privada: 'Privada', privada_religiosa: 'Privada religiosa', ong: 'ONG', regular_inclusiva: 'Escuela regular inclusiva'};
  const SINONIMOS = {sordera: 'auditiv', sordo: 'auditiv', sorda: 'auditiv', motriz: 'motor', fisica: 'motor', fisico: 'motor', tea: 'autis', ciego: 'visual', ceguera: 'visual'};
  const MSG_ESCUELA = 'Hola, quisiera saber si tienen cupo y cómo inscribir a mi hijo o hija.';
  const MSG_APOYO = 'Hola, quisiera información sobre los servicios y apoyos que ofrecen para mi hijo o hija.';

  let departamentos = {}, registros = [];
  let tipoChip = '', seleccionada = null, textoWhatsApp = '';

  /* ---------- utilidades ---------- */
  const escapar = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const normalizar = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const linea = (v) => String(v || '').replace(/\s+/g, ' ').trim();
  const bloque = (v) => String(v || '').replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
  const corto = (v, n) => { const t = linea(v); return t.length > n ? t.slice(0, n).trim() + '…' : t; };

  function configurado() {
    return typeof SUPABASE_URL !== 'undefined' && typeof SUPABASE_KEY !== 'undefined' &&
      SUPABASE_URL.startsWith('https://') && !SUPABASE_URL.includes('TU-PROYECTO') && !SUPABASE_KEY.includes('TU_CLAVE_PUBLICA');
  }
  async function api(ruta, opciones = {}) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${ruta}`, {
      ...opciones,
      headers: {apikey: SUPABASE_KEY, 'Content-Type': 'application/json', ...(opciones.headers || {})}
    });
    if (!r.ok) throw new Error(`Supabase respondió ${r.status}`);
    return r.status === 201 ? null : r.json();
  }

  /* ---------- carga de datos ---------- */
  function aRegistro(i) {
    const m = i.municipios || {}, d = m.departamentos || {};
    const t = CATEGORIA[i.categoria] || 'especializada';
    return {
      id: i.id, nombre: linea(i.nombre), departamento: d.nombre || '', municipio: m.nombre || '',
      tipo: t, sector: SECTOR[i.tipo_institucion] || '', icono: iconosTipo[t], color: coloresTipo[t],
      direccion: linea(i.direccion), telefono: linea(i.telefono_contacto), whatsapp: i.whatsapp || '',
      servicios: bloque(i.servicios), niveles: bloque(i.niveles_edades)
    };
  }
  async function cargar() {
    resumen.textContent = 'Cargando centros…';
    if (!configurado()) {
      resumen.textContent = 'El sitio aún no está conectado a la base de datos (falta configurar js/config.js).';
      vacio.hidden = true; return;
    }
    const base = 'instituciones?select=id,nombre,tipo_institucion,direccion,telefono_contacto,whatsapp,servicios,niveles_edades,municipios(nombre,departamentos(nombre))&activo=eq.true&order=nombre';
    try {
      const [deps, muns] = await Promise.all([
        api('departamentos?select=id,nombre&order=nombre'),
        api('municipios?select=nombre,departamento_id&order=nombre')
      ]);
      const porId = {};
      deps.forEach(d => { porId[d.id] = d.nombre; departamentos[d.nombre] = []; });
      muns.forEach(m => { if (porId[m.departamento_id]) departamentos[porId[m.departamento_id]].push(m.nombre); });
      let filas;
      try { filas = await api(base.replace('tipo_institucion,', 'tipo_institucion,categoria,')); }
      catch (e) { filas = await api(base); } /* si aún no existe la columna "categoria" */
      registros = filas.map(aRegistro);
      llenarDepartamentos(); pintar();
    } catch (e) {
      console.error(e);
      resumen.textContent = 'No pudimos cargar los centros. Revisa tu conexión a internet e inténtalo de nuevo.';
    }
  }

  /* ---------- filtros y resultados ---------- */
  function llenarSelect(select, nombres, etiqueta) {
    select.replaceChildren(new Option(etiqueta, ''));
    nombres.slice().sort((a, b) => a.localeCompare(b, 'es')).forEach(n => select.add(new Option(n, n)));
  }
  function llenarDepartamentos() {
    llenarSelect(dep, Object.keys(departamentos), 'Todos los departamentos');
    llenarSelect($('depf'), Object.keys(departamentos), 'Prefiero no indicarlo');
  }
  function actualizarMunicipios() {
    llenarSelect(mun, dep.value ? departamentos[dep.value] : [], dep.value ? 'Todos los municipios' : 'Elige primero un departamento');
    mun.disabled = !dep.value;
    pintar();
  }
  function filtrar() {
    const terminos = normalizar(texto.value).split(/\s+/).filter(Boolean);
    const t = tipoChip || tipo.value;
    return registros.filter(r => {
      if (dep.value && r.departamento !== dep.value) return false;
      if (mun.value && r.municipio !== mun.value) return false;
      if (t && r.tipo !== t) return false;
      const pajar = normalizar([r.nombre, r.departamento, r.municipio, r.sector, r.servicios, r.niveles, nombresTipo[r.tipo]].join(' '));
      return terminos.every(w => pajar.includes(w) || (SINONIMOS[w] && pajar.includes(SINONIMOS[w])));
    });
  }
  function tarjeta(r) {
    const accion = r.tipo === 'organizacion' ? 'Escribir al centro' : 'Escribir a la escuela';
    const datos = [r.telefono ? `📞 ${escapar(r.telefono)}` : 'Teléfono por confirmar', r.direccion ? '📍 Con dirección' : 'Dirección por confirmar']
      .map(t => `<span class="mini-tag">${t}</span>`).join('');
    return `<article class="resultado-card">
      <div class="resultado-cabecera ${r.color}"><span class="resultado-icono" aria-hidden="true">${r.icono}</span><span class="demo-etiqueta">${escapar(r.sector || nombresTipo[r.tipo])}</span><span class="resultado-decor" aria-hidden="true">✦</span></div>
      <div class="resultado-cuerpo"><span class="etiqueta-tipo ${r.color}">${escapar(nombresTipo[r.tipo])}</span><h3>${escapar(r.nombre)}</h3>
        <p class="resultado-ubicacion"><span aria-hidden="true">⌖</span> ${escapar(r.municipio)}, ${escapar(r.departamento)}</p>
        <p class="resultado-descripcion">${escapar(corto(r.servicios, 150) || 'Servicios por confirmar.')}</p>
        <div class="mini-tags">${datos}</div>
        <div class="resultado-pie"><span></span><button class="btn-ficha" type="button" data-detalle="${escapar(r.id)}">Ver detalles <span aria-hidden="true">→</span></button></div>
        <button class="btn-escribir" type="button" data-escribir="${escapar(r.id)}">${accion} <span aria-hidden="true">↗</span></button></div>
    </article>`;
  }
  function pintar() {
    if (!registros.length && !Object.keys(departamentos).length) return;
    const rows = filtrar(), ord = orden.value;
    const por = (a, b) => a.nombre.localeCompare(b.nombre, 'es');
    rows.sort((a, b) => ord === 'departamento' ? a.departamento.localeCompare(b.departamento, 'es') || por(a, b)
      : ord === 'tipo' ? nombresTipo[a.tipo].localeCompare(nombresTipo[b.tipo], 'es') || por(a, b) : por(a, b));
    lista.innerHTML = rows.map(tarjeta).join('');
    resumen.textContent = `${rows.length} ${rows.length === 1 ? 'resultado' : 'resultados'} · ${registros.length} centros registrados`;
    vacio.hidden = rows.length > 0;
  }
  function seleccionarChip(valor) {
    tipoChip = valor; tipo.value = valor;
    document.querySelectorAll('[data-chip]').forEach(b => { const a = b.dataset.chip === valor; b.classList.toggle('activo', a); b.setAttribute('aria-pressed', String(a)); });
    pintar();
  }

  /* ---------- detalle ---------- */
  const buscarPorId = (id) => registros.find(x => String(x.id) === String(id));
  function abrirDetalle(id, origen) {
    const r = buscarPorId(id); if (!r) return;
    seleccionada = r;
    $('detalleIcono').textContent = r.icono;
    $('detalleTipo').textContent = nombresTipo[r.tipo] + (r.sector ? ' · ' + r.sector : '');
    $('detalleNombre').textContent = r.nombre;
    $('detalleUbicacion').textContent = `${r.municipio}, ${r.departamento}`;
    $('detalleDireccion').textContent = r.direccion || 'Dirección por confirmar.';
    $('detalleTelefono').textContent = r.telefono || 'Teléfono por confirmar.';
    $('detalleServicios').textContent = r.servicios || 'Por confirmar.';
    $('detalleEdades').textContent = r.niveles || 'Por confirmar.';
    $('escribirCentro').textContent = r.tipo === 'organizacion' ? 'Escribir al centro →' : 'Escribir a la escuela →';
    const d = $('detalleCentro');
    d.showModal();
    $('cerrarDetalle').onclick = $('cerrarDetalleAbajo').onclick = () => d.close();
    d.addEventListener('close', function f() { if (origen && origen.isConnected) origen.focus(); d.removeEventListener('close', f); });
  }

  /* ---------- formulario de contacto ---------- */
  function abrirFormulario(r, origen) {
    if (!r) return;
    seleccionada = r;
    $('contactoPara').textContent = `${r.nombre} · ${r.municipio}, ${r.departamento}`;
    $('contactoTitulo').textContent = r.tipo === 'organizacion' ? 'Escribe al centro de apoyo' : 'Escribe a la escuela';
    $('formContacto').hidden = false; $('resultadoContacto').hidden = true; $('mensajeContacto').textContent = '';
    $('formContacto').reset();
    $('depf').value = dep.value || ''; llenarMunicipiosFamilia(); $('munf').value = mun.value || '';
    $('mj').value = r.tipo === 'organizacion' ? MSG_APOYO : MSG_ESCUELA;
    const d = $('contactoCentro');
    d.showModal();
    d.addEventListener('close', function f() { if (origen && origen.isConnected) origen.focus(); d.removeEventListener('close', f); });
  }
  function llenarMunicipiosFamilia() {
    const d = $('depf').value;
    llenarSelect($('munf'), d ? departamentos[d] : [], d ? 'Prefiero no indicarlo' : 'Elige primero un departamento');
    $('munf').disabled = !d;
  }
  function crearMensaje(p) {
    return [
      `Hola, quisiera información de ${seleccionada.nombre}.`,
      `Nombre de quien consulta: ${p.nombre_encargado}`,
      p.nombre_estudiante ? `Nombre del niño, niña o joven: ${p.nombre_estudiante}` : '',
      p.edad_estudiante !== null ? `Edad: ${p.edad_estudiante}` : '',
      `Apoyo que busca: ${p.tipo_apoyo.join(', ')}`,
      [p.comunidad_barrio, p.municipio_familia, p.departamento_familia].filter(Boolean).length ? `Vivimos en: ${[p.comunidad_barrio, p.municipio_familia, p.departamento_familia].filter(Boolean).join(', ')}` : '',
      `Teléfono de contacto: ${p.telefono_encargado}`,
      `Mensaje: ${p.mensaje}`,
      'Mensaje preparado desde EducaRuta.'
    ].filter(Boolean).join('\n');
  }
  const numeroWhatsApp = (v) => { let n = String(v || '').replace(/\D/g, ''); if (n.length === 8) n = '505' + n; return n; };

  $('formContacto').addEventListener('submit', async (e) => {
    e.preventDefault();
    const aviso = $('mensajeContacto'); aviso.textContent = '';
    const nombre = $('ne').value.trim(), telefono = $('te').value.replace(/\D/g, '');
    const edadTxt = $('ed').value.trim(), edad = edadTxt === '' ? null : Number(edadTxt);
    const apoyos = Array.from(document.querySelectorAll('#apoyos input:checked')).map(x => x.value);
    const mensaje = $('mj').value.trim();
    if (nombre.length < 2) { aviso.textContent = 'Escribe tu nombre completo para continuar.'; $('ne').focus(); return; }
    if (telefono.length < 8 || telefono.length > 15) { aviso.textContent = 'Revisa el teléfono. Debe tener entre 8 y 15 números.'; $('te').focus(); return; }
    if (!apoyos.length) { aviso.textContent = 'Marca al menos una opción en “¿Qué apoyo necesita?”.'; return; }
    if (apoyos.includes('No lo sé') && apoyos.length > 1) { aviso.textContent = 'Si marcas “No lo sé”, deja sin marcar las demás opciones.'; return; }
    if (edad !== null && (!Number.isInteger(edad) || edad < 0 || edad > 99)) { aviso.textContent = 'Escribe una edad entre 0 y 99, o deja el campo vacío.'; $('ed').focus(); return; }
    if (!mensaje) { aviso.textContent = 'Escribe un mensaje para el centro.'; $('mj').focus(); return; }
    if (!$('ok').checked) { aviso.textContent = 'Debes aceptar el aviso para continuar.'; $('ok').focus(); return; }
    if (!configurado()) { aviso.textContent = 'El sitio aún no está conectado a la base de datos.'; return; }

    const payload = {
      nombre_encargado: nombre, telefono_encargado: telefono,
      nombre_estudiante: $('es').value.trim() || null, edad_estudiante: edad, tipo_apoyo: apoyos,
      departamento_familia: $('depf').value || null, municipio_familia: $('munf').value || null,
      comunidad_barrio: $('co').value.trim() || null, centro_id: seleccionada.id,
      mensaje, consentimiento_datos: true
    };
    const btn = $('formContacto').querySelector('[type="submit"]');
    btn.disabled = true; btn.textContent = 'Guardando…';
    try {
      await api('solicitudes', {method: 'POST', headers: {Prefer: 'return=minimal'}, body: JSON.stringify(payload)});
    } catch (err) {
      console.error(err);
      aviso.textContent = 'No pudimos guardar tu solicitud. Revisa tu internet e inténtalo de nuevo.';
      btn.disabled = false; btn.innerHTML = 'Guardar y continuar <span aria-hidden="true">→</span>';
      return;
    }
    btn.disabled = false; btn.innerHTML = 'Guardar y continuar <span aria-hidden="true">→</span>';
    textoWhatsApp = crearMensaje(payload);
    const wa = numeroWhatsApp(seleccionada.whatsapp), tel = seleccionada.telefono.replace(/\D/g, '');
    $('resultadoContactoTitulo').textContent = 'Tu solicitud quedó guardada';
    $('resultadoContactoTexto').textContent = wa
      ? 'Falta un paso: revisa el mensaje y pulsa “Continuar a WhatsApp” para enviarlo al centro.'
      : 'Tu solicitud se guardó. Por ahora este centro no recibe mensajes por WhatsApp desde EducaRuta. Puedes copiar el mensaje y comunicarte con el centro' + (tel ? ' por teléfono.' : '.');
    $('abrirWhatsApp').hidden = !wa;
    if (wa) $('abrirWhatsApp').href = `https://wa.me/${wa}?text=${encodeURIComponent(textoWhatsApp)}`;
    $('llamarCentro').hidden = !(tel && !wa);
    if (tel) $('llamarCentro').href = `tel:+505${tel.replace(/^505/, '')}`;
    $('vistaMensaje').textContent = textoWhatsApp;
    $('copiarMensaje').textContent = 'Copiar mensaje';
    $('formContacto').hidden = true; $('resultadoContacto').hidden = false;
    $('resultadoContacto').scrollIntoView({behavior: 'smooth', block: 'start'});
  });

  $('copiarMensaje').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(textoWhatsApp); $('copiarMensaje').textContent = 'Mensaje copiado'; }
    catch (e) {
      const rango = document.createRange(); rango.selectNodeContents($('vistaMensaje'));
      const s = window.getSelection(); s.removeAllRanges(); s.addRange(rango);
      $('copiarMensaje').textContent = 'Selecciona y copia el texto';
    }
  });

  /* ---------- eventos ---------- */
  $('escribirCentro').addEventListener('click', () => { const r = seleccionada; $('detalleCentro').close(); abrirFormulario(r, null); });
  $('cerrarContacto').addEventListener('click', () => $('contactoCentro').close());
  $('contactoCentro').addEventListener('click', e => { if (e.target === $('contactoCentro')) $('contactoCentro').close(); });
  $('detalleCentro').addEventListener('click', e => { if (e.target === $('detalleCentro')) $('detalleCentro').close(); });
  $('depf').addEventListener('change', llenarMunicipiosFamilia);
  lista.addEventListener('click', e => {
    const w = e.target.closest('[data-escribir]'); if (w) return abrirFormulario(buscarPorId(w.dataset.escribir), w);
    const d = e.target.closest('[data-detalle]'); if (d) abrirDetalle(d.dataset.detalle, d);
  });
  dep.addEventListener('change', actualizarMunicipios);
  mun.addEventListener('change', pintar);
  texto.addEventListener('input', pintar);
  tipo.addEventListener('change', () => seleccionarChip(tipo.value));
  orden.addEventListener('change', pintar);
  filtros.addEventListener('submit', e => { e.preventDefault(); pintar(); $('titulo-resultados').scrollIntoView({behavior: 'smooth', block: 'start'}); });
  $('limpiar').addEventListener('click', () => { dep.value = ''; texto.value = ''; orden.value = 'nombre'; actualizarMunicipios(); seleccionarChip(''); });
  $('reiniciarVacio').addEventListener('click', () => { $('limpiar').click(); $('titulo-filtros').scrollIntoView({behavior: 'smooth', block: 'center'}); });
  document.querySelectorAll('[data-chip]').forEach(b => b.addEventListener('click', () => seleccionarChip(b.dataset.chip)));

  cargar();
})();
