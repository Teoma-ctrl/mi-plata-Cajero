// ==========================================
// CLASE BASE: Cuenta (Encapsulamiento)
// ==========================================
class Cuenta {
    // Campos privados de JavaScript (#)
    #saldo;
    #movimientos;

    constructor(id, titular, saldoInicial = 0) {
        this.id = id;
        this.titular = titular;
        this.#saldo = Number(saldoInicial);
        this.#movimientos = [];
    }

    // Métodos Getter para acceder al encapsulamiento de forma segura
    getSaldo() {
        return this.#saldo;
    }

    getMovimientos() {
        // Retorna una copia para proteger el arreglo privado
        return [...this.#movimientos];
    }

    // Método para modificar saldo internamente de forma controlada
    _modificarSaldo(nuevoSaldo) {
        this.#saldo = Number(nuevoSaldo);
    }

    // Registrar un movimiento en el historial
    registrarMovimiento(tipo, valor, detalle) {
        const fecha = new Date().toLocaleString();
        const movimiento = {
            fecha,
            tipo,
            valor: Number(valor),
            detalle
        };
        // Inserta al inicio para orden descendente (más reciente primero)
        this.#movimientos.unshift(movimiento);
    }

    // Métodos genéricos que pueden ser sobrescritos (Polimorfismo)
    consignar(monto) {
        if (monto <= 0) {
            throw new Error("El monto a consignar debe ser mayor a cero.");
        }
        this.#saldo += monto;
        this.registrarMovimiento("Consignación", monto, "Consignación en efectivo/sucursal");
        return this.#saldo;
    }

    retirar(monto) {
        // Implementación base genérica
        if (monto <= 0) {
            throw new Error("El monto a retirar debe ser mayor a cero.");
        }
        if (monto > this.#saldo) {
            throw new Error("Saldo insuficiente para realizar el retiro.");
        }
        this.#saldo -= monto;
        this.registrarMovimiento("Retiro", monto, "Retiro de efectivo");
        return this.#saldo;
    }
}

// ==========================================
// CLASE HIJA: CuentaAhorros (Herencia y Polimorfismo)
// ==========================================
class CuentaAhorros extends Cuenta {
    constructor(id, titular, saldoInicial = 0) {
        super(id, titular, saldoInicial);
        this.tipoProducto = "Cuenta de Ahorros";
        this.tasaInteresRetiro = 0.015; // 1.5% mensual aplicado al retiro
    }

    // Sobrescribir el método retirar (POLIMORFISMO)
    retirar(monto) {
        monto = Number(monto);
        if (monto <= 0) {
            throw new Error("El monto a retirar debe ser mayor a cero.");
        }

        const interes = monto * this.tasaInteresRetiro;
        const totalDescontar = monto + interes;

        if (totalDescontar > this.getSaldo()) {
            throw new Error(`Saldo insuficiente. Estás intentando retirar $${monto.toLocaleString()} más un interés de $${interes.toLocaleString()} (Total: $${totalDescontar.toLocaleString()}), pero tu saldo actual es $${this.getSaldo().toLocaleString()}.`);
        }

        const nuevoSaldo = this.getSaldo() - totalDescontar;
        this._modificarSaldo(nuevoSaldo);
        
        this.registrarMovimiento(
            "Retiro Ahorros", 
            totalDescontar, 
            `Retiro: $${monto.toLocaleString()} + Interés (1.5%): $${interes.toLocaleString()}`
        );

        return {
            montoRetirado: monto,
            interesCobrado: interes,
            totalDescontado: totalDescontar,
            saldoRestante: nuevoSaldo
        };
    }
}

// ==========================================
// CLASE HIJA: CuentaCorriente (Herencia y Polimorfismo)
// ==========================================
class CuentaCorriente extends Cuenta {
    constructor(id, titular, saldoInicial = 0) {
        super(id, titular, saldoInicial);
        this.tipoProducto = "Cuenta Corriente";
        this.porcentajeSobregiro = 0.20; // 20% de sobregiro
    }

    // Sobrescribir el método retirar (POLIMORFISMO) con regla de sobregiro
    retirar(monto) {
        monto = Number(monto);
        if (monto <= 0) {
            throw new Error("El monto a retirar debe ser mayor a cero.");
        }

        const saldoActual = this.getSaldo();
        const limiteSobregiro = saldoActual * (1 + this.porcentajeSobregiro); // Saldo + 20%

        if (monto > limiteSobregiro) {
            throw new Error(`El monto supera el límite permitido con sobregiro del 20% ($${limiteSobregiro.toLocaleString()}).`);
        }

        const nuevoSaldo = saldoActual - monto;
        this._modificarSaldo(nuevoSaldo);

        let detalle = "Retiro cuenta corriente";
        if (nuevoSaldo < 0) {
            detalle = `Retiro utilizando SOBREGIRO. Saldo en negativo.`;
        }

        this.registrarMovimiento("Retiro Corriente", monto, detalle);

        return {
            montoRetirado: monto,
            utilizoSobregiro: nuevoSaldo < 0,
            saldoRestante: nuevoSaldo
        };
    }
}

// ==========================================
// CLASE HIJA: TarjetaCredito (Herencia y Reglas de Compras)
// ==========================================
class TarjetaCredito extends Cuenta {
    #cupoTotal;
    #deudaAcumulada;

    constructor(id, titular, cupoInicial = 1000000) {
        super(id, titular, 0); // La cuenta base de saldo inicia en 0 para TC
        this.tipoProducto = "Tarjeta de Crédito";
        this.#cupoTotal = Number(cupoInicial);
        this.#deudaAcumulada = 0;
    }

    getCupoTotal() {
        return this.#cupoTotal;
    }

    getDeudaAcumulada() {
        return this.#deudaAcumulada;
    }

    getCupoDisponible() {
        return this.#cupoTotal - this.#deudaAcumulada;
    }

    // Sobrescribir getSaldo para que devuelva el cupo disponible en el panel
    getSaldo() {
        return this.getCupoDisponible();
    }

    // Realizar una compra financiada
    realizarCompra(capital, cuotas) {
        capital = Number(capital);
        cuotas = Number(cuotas);

        if (capital <= 0) {
            throw new Error("El valor de la compra debe ser mayor a cero.");
        }
        if (cuotas < 1) {
            throw new Error("El número de cuotas debe ser al menos 1.");
        }
        if (capital > this.getCupoDisponible()) {
            throw new Error(`Cupo insuficiente. Tu cupo disponible es $${this.getCupoDisponible().toLocaleString()}.`);
        }

        // Definir tasa de interés mensual según la regla académica
        let tasaMensual = 0;
        if (cuotas <= 2) {
            tasaMensual = 0; // 0% para 1 y 2 cuotas
        } else if (cuotas >= 3 && cuotas <= 6) {
            tasaMensual = 0.019; // 1.9% para 3 a 6 cuotas
        } else {
            tasaMensual = 0.023; // 2.3% para 7 o más cuotas
        }

        // Calcular cuota mensual con la fórmula requerida
        let cuotaMensual = 0;
        if (tasaMensual === 0) {
            cuotaMensual = capital / cuotas;
        } else {
            cuotaMensual = (capital * tasaMensual) / (1 - Math.pow(1 + tasaMensual, -cuotas));
        }

        const totalEstimado = cuotaMensual * cuotas;
        this.#deudaAcumulada += capital;

        this.registrarMovimiento(
            "Compra Tarjeta",
            capital,
            `Compra a ${cuotas} cuotas. Tasa: ${(tasaMensual * 100).toFixed(1)}%. Cuota aprox: $${Math.round(cuotaMensual).toLocaleString()}/mes`
        );

        return {
            capital,
            cuotas,
            tasaMensual: tasaMensual * 100,
            cuotaMensual: Math.round(cuotaMensual),
            totalEstimado: Math.round(totalEstimado),
            cupoDisponibleRestante: this.getCupoDisponible()
        };
    }
}

// ==========================================
// CLASE CLIENTE
// ==========================================
class Cliente {
    constructor(identificacion, nombreCompleto, celular, usuario, password) {
        this.identificacion = identificacion;
        this.nombreCompleto = nombreCompleto;
        this.celular = celular;
        this.usuario = usuario;
        this.password = password;
        this.intentosFallidos = 0;
        this.bloqueado = false;
        this.productos = []; // Arreglo que contendrá objetos CuentaAhorros, CuentaCorriente, TarjetaCredito
    }

    agregarProducto(producto) {
        this.productos.push(producto);
    }

    buscarProductoPorId(idProducto) {
        return this.productos.find(p => p.id === idProducto);
    }
}