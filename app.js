/* === CONFIGURACIÓN === */
const API_URL = "https://script.google.com/macros/s/AKfycbzFF0GDbnLuqCgM8K1QHS5ID5tw6J8RprfgVog3fpJ3dlTBsep_pOlR4TXTeGzMPxrwSg/exec";

let clienteActual = null; // Datos actuales en la base (si existe)

document.addEventListener("DOMContentLoaded", () => {
  const numeroInput = document.getElementById("numeroInput");
  const btnBuscar = document.getElementById("btnBuscar");
  const btnGuardarNuevo = document.getElementById("btnGuardarNuevo");
  const btnReemplazar = document.getElementById("btnReemplazar");

  btnBuscar.addEventListener("click", buscarCliente);
  numeroInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") buscarCliente();
  });

  btnGuardarNuevo.addEventListener("click", () => guardarCliente("nuevo"));
  btnReemplazar.addEventListener("click", () => guardarCliente("reemplazo"));
});

/* === Utilidades UI === */
function showToast(msg, type = "info") {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = `toast toast-${type}`;
  setTimeout(() => {
    toast.className = "toast hidden";
  }, 4000);
}

function setEstado(texto) {
  document.getElementById("estadoTexto").textContent = texto;
}

function limpiarInfoActual() {
  clienteActual = null;
  const infoSection = document.getElementById("infoActualSection");
  const infoDiv = document.getElementById("infoActual");
  infoDiv.innerHTML = "";
  infoSection.classList.add("hidden");

  document.getElementById("btnGuardarNuevo").disabled = false;
  document.getElementById("btnReemplazar").disabled = true;
}

/* === Llamadas a la API === */
async function apiPost(payload) {
  const resp = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    throw new Error("Error HTTP: " + resp.status);
  }
  return await resp.json();
}

/* === Buscar cliente por número === */
async function buscarCliente() {
  const numero = document.getElementById("numeroInput").value.trim();

  if (!numero) {
    showToast("Ingresá un número de cliente", "warn");
    return;
  }

  setEstado("Buscando cliente...");
  limpiarInfoActual();

  try {
    const data = await apiPost({
      action: "getCliente",
      numero,
    });

    if (!data.ok) {
      showToast(data.error || "Error en la búsqueda", "error");
      setEstado("Error al buscar el cliente.");
      return;
    }

    if (!data.found) {
      setEstado("Cliente no encontrado. Podés guardarlo como nuevo.");
      document.getElementById("btnGuardarNuevo").disabled = false;
      document.getElementById("btnReemplazar").disabled = true;
      showToast("Este número no existe en la base. Es nuevo.", "info");
      return;
    }

    // 👉 Existe en la base
    clienteActual = data.cliente;
    mostrarClienteActual(clienteActual);

    // Rellenamos el formulario con los datos actuales (más cómodo para editar)
    document.getElementById("nombreInput").value = clienteActual.nombre || "";
    document.getElementById("apellidoInput").value = clienteActual.apellido || "";
    document.getElementById("domicilioInput").value = clienteActual.domicilio || "";
    document.getElementById("localidadInput").value = clienteActual.localidad || "";

    document.getElementById("btnGuardarNuevo").disabled = true;
    document.getElementById("btnReemplazar").disabled = false;

    setEstado("El número ya existe. Podés actualizar sus datos con 'Reemplazar'.");
    showToast("Cliente encontrado en la base.", "success");
  } catch (err) {
    console.error(err);
    showToast("Error al conectar con el servidor", "error");
    setEstado("Error de conexión con la API.");
  }
}

function mostrarClienteActual(cli) {
  const infoSection = document.getElementById("infoActualSection");
  const infoDiv = document.getElementById("infoActual");

  infoDiv.innerHTML = `
    <p><strong>Número:</strong> ${cli.numero}</p>
    <p><strong>Nombre:</strong> ${cli.nombre}</p>
    <p><strong>Apellido:</strong> ${cli.apellido}</p>
    <p><strong>Domicilio:</strong> ${cli.domicilio}</p>
    <p><strong>Localidad:</strong> ${cli.localidad}</p>
  `;

  infoSection.classList.remove("hidden");
}

/* === Guardar cliente (nuevo o reemplazo) === */
async function guardarCliente(modo) {
  const numero = document.getElementById("numeroInput").value.trim();
  const nombre = document.getElementById("nombreInput").value.trim();
  const apellido = document.getElementById("apellidoInput").value.trim();
  const domicilio = document.getElementById("domicilioInput").value.trim();
  const localidad = document.getElementById("localidadInput").value.trim();

  if (!numero || !nombre || !domicilio || !localidad) {
    showToast("Número, nombre, domicilio y localidad son obligatorios", "warn");
    return;
  }

  let mensajeConfirm = "";

  if (modo === "nuevo") {
    mensajeConfirm =
      `Se va a CREAR el cliente ${numero} en ambas bases.\n\n` +
      `Nombre: ${nombre}\n` +
      `Domicilio: ${domicilio}\n` +
      `Localidad: ${localidad}\n\n` +
      `¿Confirmás?`;
  } else {
    let viejo = "";
    if (clienteActual) {
      viejo =
        `ACTUAL:\n` +
        `Nombre: ${clienteActual.nombre}\n` +
        `Domicilio: ${clienteActual.domicilio}\n` +
        `Localidad: ${clienteActual.localidad}\n\n`;
    }

    const nuevo =
      `NUEVO:\n` +
      `Nombre: ${nombre}\n` +
      `Domicilio: ${domicilio}\n` +
      `Localidad: ${localidad}\n\n`;

    mensajeConfirm =
      `Se van a REEMPLAZAR los datos del cliente ${numero} en ambas bases.\n\n` +
      viejo +
      nuevo +
      `¿Estás seguro?`;
  }

  if (!confirm(mensajeConfirm)) return;

  setEstado("Guardando cambios...");
  try {
    const data = await apiPost({
      action: "guardarCliente",
      modo,
      numero,
      nombre,
      apellido,
      domicilio,
      localidad,
    });

    if (!data.ok) {
      showToast(data.error || "Error al guardar", "error");
      setEstado("Hubo un problema al guardar.");
      return;
    }

    showToast(data.message || "Cliente guardado correctamente", "success");
    setEstado(
      data.mode === "nuevo"
        ? "Cliente creado en ambas bases."
        : "Cliente actualizado en ambas bases."
    );

    // Después de guardar, forzamos nueva búsqueda para refrescar datos
    buscarCliente();
  } catch (err) {
    console.error(err);
    showToast("Error de conexión al guardar", "error");
    setEstado("Error de conexión con la API.");
  }
}
