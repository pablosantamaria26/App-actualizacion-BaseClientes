/* === CONFIG GENERAL === */
const API_URL = "https://jolly-dust-2d7a.santamariapablodaniel.workers.dev/";

let clienteActual = null;

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

/* === UI Helpers === */
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

function toggleLoading(show) {
  const overlay = document.getElementById("loadingOverlay");
  if (show) {
    overlay.classList.remove("hidden");
  } else {
    overlay.classList.add("hidden");
  }
}

/* === Llamada genérica a la API (via Worker) === */
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
  toggleLoading(true);

  try {
    const data = await apiPost({
      action: "getCliente",
      numero,
    });

    toggleLoading(false);

    if (!data.ok) {
      showToast(data.error || "Error en la búsqueda", "error");
      setEstado("Error al buscar el cliente.");
      return;
    }

    if (!data.found) {
      setEstado("Cliente no encontrado. Podés guardarlo como nuevo.");
      document.getElementById("btnGuardarNuevo").disabled = false;
      document.getElementById("btnReemplazar").disabled = true;
      showToast("Este número no existe en ninguna base. Es nuevo.", "info");
      return;
    }

    // Existe en la base
    clienteActual = data.cliente;
    mostrarClienteActual(clienteActual);

    // Completamos el formulario con los datos actuales
    document.getElementById("nombreInput").value = clienteActual.nombre || "";
    document.getElementById("apellidoInput").value = clienteActual.apellido || "";
    document.getElementById("domicilioInput").value = clienteActual.domicilio || "";
    document.getElementById("localidadInput").value = clienteActual.localidad || "";

    document.getElementById("btnGuardarNuevo").disabled = true;
    document.getElementById("btnReemplazar").disabled = false;

    setEstado("El número ya existe. Podés actualizarlo con 'Reemplazar datos'.");
    showToast("Cliente encontrado en la base.", "success");

  } catch (err) {
    console.error(err);
    toggleLoading(false);
    showToast("Error al conectar con el servidor", "error");
    setEstado("Error de conexión con la API.");
  }
}

function mostrarClienteActual(cli) {
  const infoSection = document.getElementById("infoActualSection");
  const infoDiv = document.getElementById("infoActual");

  infoDiv.innerHTML = `
    <p><span>Número:</span> ${cli.numero}</p>
    <p><span>Nombre:</span> ${cli.nombre}</p>
    <p><span>Apellido:</span> ${cli.apellido}</p>
    <p><span>Domicilio:</span> ${cli.domicilio}</p>
    <p><span>Localidad:</span> ${cli.localidad}</p>
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

  const ok = await customConfirm("Confirmar acción", mensajeConfirm);
if (!ok) return;


  setEstado("Guardando cambios...");
  toggleLoading(true);

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

    toggleLoading(false);

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

    // Refrescar datos actuales
    buscarCliente();

  } catch (err) {
    console.error(err);
    toggleLoading(false);
    showToast("Error de conexión al guardar", "error");
    setEstado("Error de conexión con la API.");
  }
}

/* =========================================================
   Confirm personalizado — Devuelve Promesa (true / false)
   ========================================================= */
function customConfirm(titulo, mensaje) {
  return new Promise((resolve) => {
    const overlay = document.getElementById("confirmOverlay");
    const msgBox = document.getElementById("confirmMessage");
    const titleBox = document.getElementById("confirmTitle");

    titleBox.textContent = titulo;
    msgBox.textContent = mensaje;
    overlay.classList.remove("hidden");

    const okBtn = document.getElementById("confirmOk");
    const cancelBtn = document.getElementById("confirmCancel");

    function close(result) {
      overlay.classList.add("hidden");
      okBtn.removeEventListener("click", okHandler);
      cancelBtn.removeEventListener("click", cancelHandler);
      resolve(result);
    }

    function okHandler() { close(true); }
    function cancelHandler() { close(false); }

    okBtn.addEventListener("click", okHandler);
    cancelBtn.addEventListener("click", cancelHandler);

    // Cerrar con click afuera
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close(false);
    });

    // Cerrar con ESC
    document.addEventListener("keydown", function escHandler(ev) {
      if (ev.key === "Escape") {
        document.removeEventListener("keydown", escHandler);
        close(false);
      }
    });
  });
}

