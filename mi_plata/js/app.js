// ==========================================
// CLASE APLICACIÓN PRINCIPAL (CONTROLADOR)
// ==========================================
class BancoApp {
    constructor() {
        this.clientes = [];
        this.usuarioActual = null;
        this.productoSeleccionado = null;
        this.inicializarDatos();
    }

    // Cargar datos desde localStorage al iniciar
    inicializarDatos() {
        const datosGuardados = localStorage.getItem("mi_plata_clientes");
        if (datosGuardados) {
            const arrCrudo = JSON.parse(datosGuardados);
            this.clientes = arrCrudo.map(cData => {
                const cliente = new Cliente(
                    cData.identificacion,
                    cData.nombreCompleto,
                    cData.celular,
                    cData.usuario,
                    cData.password
                );
                cliente.intentosFallidos = cData.intentosFallidos || 0;
                cliente.bloqueado = cData.bloqueado || false;

                cliente.productos = cData.productos.map(pData => {
                    let prod;
                    if (pData.tipoProducto === "Cuenta de Ahorros") {
                        prod = new CuentaAhorros(pData.id, pData.titular, pData.saldo);
                    } else if (pData.tipoProducto === "Cuenta Corriente") {
                        prod = new CuentaCorriente(pData.id, pData.titular, pData.saldo);
                    } else if (pData.tipoProducto === "Tarjeta de Crédito") {
                        prod = new TarjetaCredito(pData.id, pData.titular, pData.cupoTotal);
                    } else {
                        prod = new Cuenta(pData.id, pData.titular, pData.saldo);
                    }

                    if (pData.movimientos) {
                        pData.movimientos.forEach(m => {
                            prod.registrarMovimiento(m.tipo, m.valor, m.detalle);
                        });
                    }
                    return prod;
                });

                return cliente;
            });
        } else {
            this.crearUsuarioDemo();
        }
    }

    guardarEnLocalStorage() {
        localStorage.setItem("mi_plata_clientes", JSON.stringify(this.clientes));
    }

    crearUsuarioDemo() {
        const demo = new Cliente("10001", "Ana María Pérez", "3009876543", "ana", "1234");
        demo.agregarProducto(new CuentaAhorros("CTA-AHO-001", "Ana María Pérez", 500000));
        demo.agregarProducto(new CuentaCorriente("CTA-COR-001", "Ana María Pérez", 1000000));
        demo.agregarProducto(new TarjetaCredito("TC-001", "Ana María Pérez", 2000000));
        this.clientes.push(demo);
        this.guardarEnLocalStorage();
    }

    // GESTIÓN DE VISTAS
    mostrarVista(idVista) {
        document.querySelectorAll(".vista").forEach(v => v.classList.add("oculto"));
        document.getElementById(idVista).classList.remove("oculto");
        this.cerrarModales();
    }

    actualizarCabeceraNav() {
        const navPublico = document.getElementById("nav-publico");
        const navPrivado = document.getElementById("nav-privado");
        const saludo = document.getElementById("saludo-usuario");

        if (this.usuarioActual) {
            navPublico.classList.add("oculto");
            navPrivado.classList.remove("oculto");
            saludo.textContent = `Hola, ${this.usuarioActual.nombreCompleto}`;
        } else {
            navPublico.classList.remove("oculto");
            navPrivado.classList.add("oculto");
        }
    }

    // REGISTRO DE CLIENTES (CRUD - Create)
    registrarCliente(event) {
        event.preventDefault();
        const id = document.getElementById("reg-id").value.trim();
        const nombre = document.getElementById("reg-nombre").value.trim();
        const celular = document.getElementById("reg-celular").value.trim();
        const usuario = document.getElementById("reg-usuario").value.trim();
        const pass = document.getElementById("reg-password").value;
        const passConf = document.getElementById("reg-password-confirm").value;

        if (pass !== passConf) {
            this.mostrarToast("Las contraseñas no coinciden.", "error");
            return;
        }

        const existeUsuario = this.clientes.find(c => c.usuario === usuario);
        if (existeUsuario) {
            this.mostrarToast("El nombre de usuario ya está en uso.", "error");
            return;
        }

        const existeId = this.clientes.find(c => c.identificacion === id);
        if (existeId) {
            this.mostrarToast("El número de identificación ya se encuentra registrado.", "error");
            return;
        }

        const nuevoCliente = new Cliente(id, nombre, celular, usuario, pass);

        const randNum = Math.floor(1000 + Math.random() * 9000);
        nuevoCliente.agregarProducto(new CuentaAhorros(`CTA-AHO-${randNum}`, nombre, 300000));
        nuevoCliente.agregarProducto(new CuentaCorriente(`CTA-COR-${randNum}`, nombre, 800000));
        nuevoCliente.agregarProducto(new TarjetaCredito(`TC-${randNum}`, nombre, 1500000));

        this.clientes.push(nuevoCliente);
        this.guardarEnLocalStorage();

        this.mostrarToast("¡Registro exitoso! Inicia sesión para acceder.", "exito");
        document.getElementById("form-registro").reset();
        this.mostrarVista("vista-login");
    }

    // INICIO DE SESIÓN Y BLOQUEO
    iniciarSesion(event) {
        event.preventDefault();
        const usuarioInput = document.getElementById("login-usuario").value.trim();
        const passInput = document.getElementById("login-password").value;
        const divIntentos = document.getElementById("mensaje-intentos");

        const cliente = this.clientes.find(c => c.usuario === usuarioInput);

        if (!cliente) {
            this.mostrarToast("El usuario no existe.", "error");
            return;
        }

        if (cliente.bloqueado) {
            divIntentos.textContent = "Acceso Denegado: Su cuenta se encuentra BLOQUEADA por tres intentos fallidos.";
            divIntentos.classList.remove("oculto");
            this.mostrarToast("Cuenta bloqueada.", "error");
            return;
        }

        if (cliente.password !== passInput) {
            cliente.intentosFallidos++;
            const intentosRestantes = 3 - cliente.intentosFallidos;
            
            if (cliente.intentosFallidos >= 3) {
                cliente.bloqueado = true;
                divIntentos.textContent = "Cuenta bloqueada por seguridad tras 3 intentos fallidos.";
                divIntentos.classList.remove("oculto");
                this.mostrarToast("Su cuenta ha sido bloqueada.", "error");
            } else {
                divIntentos.textContent = `Contraseña incorrecta. Intentos fallidos: ${cliente.intentosFallidos}/3. Le quedan ${intentosRestantes}.`;
                divIntentos.classList.remove("oculto");
                this.mostrarToast("Credenciales incorrectas.", "error");
            }

            this.guardarEnLocalStorage();
            return;
        }

        cliente.intentosFallidos = 0;
        divIntentos.classList.add("oculto");
        this.usuarioActual = cliente;
        this.guardarEnLocalStorage();

        document.getElementById("form-login").reset();
        this.actualizarCabeceraNav();
        this.mostrarVista("vista-panel");
        this.cargarSelectorProductos();
        this.mostrarToast(`¡Bienvenido, ${cliente.nombreCompleto}!`, "exito");
    }

    cerrarSesion() {
        this.usuarioActual = null;
        this.productoSeleccionado = null;
        this.actualizarCabeceraNav();
        this.mostrarVista("vista-inicio");
        this.mostrarToast("Sesión cerrada correctamente.", "exito");
    }

    cargarSelectorProductos() {
        const contenedor = document.getElementById("selector-productos");
        contenedor.innerHTML = "";

        if (!this.usuarioActual || this.usuarioActual.productos.length === 0) {
            contenedor.innerHTML = "<p class='text-muted'>No tienes productos registrados.</p>";
            return;
        }

        this.usuarioActual.productos.forEach((prod, index) => {
            const btn = document.createElement("button");
            btn.className = "btn-producto-item";
            btn.textContent = `${prod.tipoProducto} (${prod.id})`;
            btn.onclick = () => this.seleccionarProducto(prod.id);
            contenedor.appendChild(btn);

            if (index === 0 && !this.productoSeleccionado) {
                this.seleccionarProducto(prod.id);
            }
        });
    }

    seleccionarProducto(idProducto) {
        this.productoSeleccionado = this.usuarioActual.buscarProductoPorId(idProducto);
        this.actualizarVistaDetalleProducto();
    }

    actualizarVistaDetalleProducto() {
        if (!this.productoSeleccionado) return;

        document.getElementById("det-tipo-producto").textContent = this.productoSeleccionado.tipoProducto;
        document.getElementById("det-id-producto").innerHTML = `ID: <strong>${this.productoSeleccionado.id}</strong> | Titular: ${this.productoSeleccionado.titular}`;
        document.getElementById("det-saldo-producto").textContent = `$${this.productoSeleccionado.getSaldo().toLocaleString()}`;

        const reglasDiv = document.getElementById("reglas-producto-info");
        const btnComprar = document.getElementById("btn-comprar-tc");

        if (this.productoSeleccionado instanceof CuentaAhorros) {
            reglasDiv.textContent = "Regla de Ahorros: Aplica interés del 1.5% al momento de realizar retiros.";
            btnComprar.classList.add("oculto");
        } else if (this.productoSeleccionado instanceof CuentaCorriente) {
            reglasDiv.textContent = "Regla de Corriente: Sin intereses. Permite sobregiro autorizado de hasta el 20% del saldo.";
            btnComprar.classList.add("oculto");
        } else if (this.productoSeleccionado instanceof TarjetaCredito) {
            reglasDiv.textContent = `Tarjeta de Crédito: Cupo Total: $${this.productoSeleccionado.getCupoTotal().toLocaleString()} | Deuda: $${this.productoSeleccionado.getDeudaAcumulada().toLocaleString()}`;
            btnComprar.classList.remove("oculto");
        }

        this.actualizarTablaMovimientos();
    }

    actualizarTablaMovimientos() {
        const tbody = document.getElementById("tabla-movimientos-body");
        tbody.innerHTML = "";

        const movimientos = this.productoSeleccionado.getMovimientos();
        if (movimientos.length === 0) {
            tbody.innerHTML = "<tr><td colspan='4' class='text-center text-muted'>No hay movimientos registrados en este producto.</td></tr>";
            return;
        }

        movimientos.forEach(m => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${m.fecha}</td>
                <td><strong>${m.tipo}</strong></td>
                <td>$${m.valor.toLocaleString()}</td>
                <td>${m.detalle}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    // OPERACIONES BANCARIAS
    realizarConsignacion(event) {
        event.preventDefault();
        const monto = parseFloat(document.getElementById("monto-consignacion").value);

        try {
            this.productoSeleccionado.consignar(monto);
            this.guardarEnLocalStorage();
            this.actualizarVistaDetalleProducto();
            this.cerrarModales();
            this.mostrarToast(`Consignación exitosa por $${monto.toLocaleString()}`, "exito");
        } catch (error) {
            this.mostrarToast(error.message, "error");
        }
    }

    realizarRetiro(event) {
        event.preventDefault();
        const monto = parseFloat(document.getElementById("monto-retiro").value);

        try {
            const resultado = this.productoSeleccionado.retirar(monto);
            this.guardarEnLocalStorage();
            this.actualizarVistaDetalleProducto();
            this.cerrarModales();

            if (this.productoSeleccionado instanceof CuentaAhorros) {
                this.mostrarToast(`Retiro exitoso. Se descontó $${resultado.totalDescontado.toLocaleString()} (Incluye 1.5% interés)`, "exito");
            } else if (this.productoSeleccionado instanceof CuentaCorriente) {
                const avisoSobregiro = resultado.utilizoSobregiro ? " (¡Atención: Utilizó sobregiro!)" : "";
                this.mostrarToast(`Retiro exitoso por $${monto.toLocaleString()}.${avisoSobregiro}`, "exito");
            } else {
                this.mostrarToast(`Retiro exitoso por $${monto.toLocaleString()}`, "exito");
            }
        } catch (error) {
            this.mostrarToast(error.message, "error");
        }
    }

    realizarCompraTC(event) {
        event.preventDefault();
        const valor = parseFloat(document.getElementById("compra-valor").value);
        const cuotas = parseInt(document.getElementById("compra-cuotas").value);

        try {
            if (!(this.productoSeleccionado instanceof TarjetaCredito)) {
                throw new Error("El producto seleccionado no es una tarjeta de crédito.");
            }

            const res = this.productoSeleccionado.realizarCompra(valor, cuotas);
            this.guardarEnLocalStorage();
            this.actualizarVistaDetalleProducto();
            this.cerrarModales();

            this.mostrarToast(`Compra aprobada. Cuota mensual aprox: $${res.cuotaMensual.toLocaleString()} (${cuotas} cuotas)`, "exito");
        } catch (error) {
            this.mostrarToast(error.message, "error");
        }
    }

    // CARGAR LISTA DE CUENTAS DESTINO DISPONIBLES EN EL MODAL DE TRANSFERENCIA
    poblarOpcionesTransferencia() {
        const select = document.getElementById("select-cuentas-destino");
        select.innerHTML = "<option value=''>-- Seleccionar cuenta destino --</option>";

        this.clientes.forEach(c => {
            c.productos.forEach(p => {
                // No mostrar Tarjetas de crédito como destino, ni el producto origen actual
                if (!(p instanceof TarjetaCredito) && p.id !== this.productoSeleccionado.id) {
                    const opt = document.createElement("option");
                    opt.value = p.id;
                    const esPropia = c.usuario === this.usuarioActual.usuario ? "(Propia)" : `(${c.nombreCompleto})`;
                    opt.textContent = `${p.id} - ${p.tipoProducto} ${esPropia}`;
                    select.appendChild(opt);
                }
            });
        });
    }

    seleccionarCuentaDestinoDesdeSelect(valor) {
        if (valor) {
            document.getElementById("trans-destino-id").value = valor;
        }
    }

    realizarTransferencia(event) {
        event.preventDefault();
        const destinoId = document.getElementById("trans-destino-id").value.trim();
        const monto = parseFloat(document.getElementById("trans-monto").value);

        try {
            if (monto <= 0) throw new Error("El monto debe ser mayor a cero.");
            if (this.productoSeleccionado.id === destinoId) {
                throw new Error("No puedes transferir dinero al mismo producto de origen.");
            }

            let productoDestino = null;
            for (let c of this.clientes) {
                let p = c.buscarProductoPorId(destinoId);
                if (p) {
                    productoDestino = p;
                    break;
                }
            }

            if (!productoDestino) {
                throw new Error("El producto destino especificado no existe en el sistema.");
            }

            if (productoDestino instanceof TarjetaCredito) {
                throw new Error("No se permiten transferencias directas hacia una tarjeta de crédito.");
            }

            if (this.productoSeleccionado instanceof TarjetaCredito) {
                throw new Error("No se puede transferir dinero desde una tarjeta de crédito.");
            }

            // Realizar transferencia utilizando los métodos de clase
            this.productoSeleccionado.retirar(monto); // Aplica polimorfismo de retiro
            productoDestino.consignar(monto); // Entra monto limpio al destino

            // Actualizar descripciones en los historiales
            const movsOrigen = this.productoSeleccionado.getMovimientos();
            if (movsOrigen.length > 0) {
                movsOrigen[0].tipo = "Transferencia Enviada";
                movsOrigen[0].detalle = `Enviado a cuenta: ${destinoId}`;
            }

            const movsDestino = productoDestino.getMovimientos();
            if (movsDestino.length > 0) {
                movsDestino[0].tipo = "Transferencia Recibida";
                movsDestino[0].detalle = `Recibido de: ${this.productoSeleccionado.id}`;
            }

            this.guardarEnLocalStorage();
            this.actualizarVistaDetalleProducto();
            this.cerrarModales();
            this.mostrarToast(`Transferencia exitosa por $${monto.toLocaleString()} a ${destinoId}`, "exito");

        } catch (error) {
            this.mostrarToast(error.message, "error");
        }
    }

    // PERFIL Y CONTRASEÑA
    guardarPerfil(event) {
        event.preventDefault();
        const id = document.getElementById("perfil-id").value.trim();
        const nombre = document.getElementById("perfil-nombre").value.trim();
        const celular = document.getElementById("perfil-celular").value.trim();
        const usuario = document.getElementById("perfil-usuario").value.trim();

        if (usuario !== this.usuarioActual.usuario) {
            const existe = this.clientes.find(c => c.usuario === usuario);
            if (existe) {
                this.mostrarToast("El nombre de usuario ya está ocupado.", "error");
                return;
            }
        }

        this.usuarioActual.identificacion = id;
        this.usuarioActual.nombreCompleto = nombre;
        this.usuarioActual.celular = celular;
        this.usuarioActual.usuario = usuario;

        this.guardarEnLocalStorage();
        this.actualizarCabeceraNav();
        this.cerrarModales();
        this.mostrarToast("Perfil actualizado correctamente.", "exito");
    }

    cambiarPassword(event) {
        event.preventDefault();
        const actual = document.getElementById("pass-actual").value;
        const nueva = document.getElementById("pass-nueva").value;
        const confirmar = document.getElementById("pass-confirmar").value;

        if (this.usuarioActual.password !== actual) {
            this.mostrarToast("La contraseña actual es incorrecta.", "error");
            return;
        }

        if (nueva !== confirmar) {
            this.mostrarToast("Las nuevas contraseñas no coinciden.", "error");
            return;
        }

        this.usuarioActual.password = nueva;
        this.guardarEnLocalStorage();
        this.cerrarModales();
        this.mostrarToast("Contraseña actualizada con éxito.", "exito");
    }

    // CRUD DE USUARIOS (Administración académica)
    cargarTablaAdmin() {
        const tbody = document.getElementById("tabla-admin-body");
        tbody.innerHTML = "";

        this.clientes.forEach(c => {
            const tr = document.createElement("tr");
            const esActivo = this.usuarioActual && this.usuarioActual.usuario === c.usuario;
            tr.innerHTML = `
                <td>${c.identificacion}</td>
                <td>${c.nombreCompleto} ${esActivo ? "(Actual)" : ""}</td>
                <td>${c.usuario}</td>
                <td>${c.celular}</td>
                <td>${c.bloqueado ? "Sí (Bloqueado)" : "No"}</td>
                <td>
                    ${c.bloqueado ? `<button onclick="app.desbloquearUsuario('${c.usuario}')" class="btn btn-primary btn-sm">Desbloquear</button>` : ""}
                    ${!esActivo ? `<button onclick="app.eliminarUsuario('${c.usuario}')" class="btn btn-danger btn-sm">Eliminar</button>` : "<span class='text-muted'>No eliminable</span>"}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    desbloquearUsuario(usuario) {
        const c = this.clientes.find(x => x.usuario === usuario);
        if (c) {
            c.bloqueado = false;
            c.intentosFallidos = 0;
            this.guardarEnLocalStorage();
            this.cargarTablaAdmin();
            this.mostrarToast(`Usuario ${usuario} desbloqueado.`, "exito");
        }
    }

    eliminarUsuario(usuario) {
        if (confirm(`¿Estás seguro de eliminar al usuario ${usuario}?`)) {
            this.clientes = this.clientes.filter(x => x.usuario !== usuario);
            this.guardarEnLocalStorage();
            this.cargarTablaAdmin();
            this.mostrarToast("Usuario eliminado del sistema.", "exito");
        }
    }

    // MANEJO DE MODALES
    abrirModal(idModal) {
        document.getElementById(idModal).classList.remove("oculto");

        if (idModal === "modal-transferir") {
            this.poblarOpcionesTransferencia();
        }
        if (idModal === "modal-perfil" && this.usuarioActual) {
            document.getElementById("perfil-id").value = this.usuarioActual.identificacion;
            document.getElementById("perfil-nombre").value = this.usuarioActual.nombreCompleto;
            document.getElementById("perfil-celular").value = this.usuarioActual.celular;
            document.getElementById("perfil-usuario").value = this.usuarioActual.usuario;
        }
        if (idModal === "modal-admin") {
            this.cargarTablaAdmin();
        }
    }

    cerrarModales() {
        document.querySelectorAll(".modal").forEach(m => m.classList.add("oculto"));
    }

    mostrarToast(mensaje, tipo = "exito") {
        const container = document.getElementById("toast-container");
        const toast = document.createElement("div");
        toast.className = `toast ${tipo}`;
        toast.textContent = mensaje;
        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3500);
    }
}

// Instanciar la aplicación globalmente
const app = new BancoApp();