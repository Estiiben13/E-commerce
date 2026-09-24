const API_URL = 'http://localhost:3000';


// ELEMENTOS DEL DOM

const authSection = document.getElementById('auth-section');
const storeSection = document.getElementById('store-section');

const authTitle = document.getElementById('auth-title');
const authDescription = document.getElementById('auth-description');
const authButtonText = document.getElementById('auth-button-text');

const authForm = document.getElementById('auth-form');

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

const authMessage = document.getElementById('auth-message');

const btnToggleAuth = document.getElementById('btn-toggle-auth');
const btnLogout = document.getElementById('btn-logout');

const usuarioInfo = document.getElementById('usuario-info');
const usuarioEmail = document.getElementById('usuario-email');

const productsContainer =
    document.getElementById('products-container');

const ordersContainer =
    document.getElementById('orders-container');

const btnRefreshOrders =
    document.getElementById('btn-refresh-orders');

const notification =
    document.getElementById('notification');



// VARIABLES


let modoRegistro = false;



// TOKEN


function obtenerToken() {
    return localStorage.getItem('token');
}


function guardarSesion(token, email) {

    localStorage.setItem('token', token);
    localStorage.setItem('email', email);

}


function cerrarSesion() {

    localStorage.removeItem('token');
    localStorage.removeItem('email');
    localStorage.removeItem('usuario');

    mostrarLogin();

}



// NOTIFICACIONES


function mostrarNotificacion(mensaje, tipo = 'success') {

    notification.textContent = mensaje;

    notification.className =
        `notification ${tipo}`;

    setTimeout(() => {

        notification.classList.add('hidden');

    }, 3000);

}



// CAMBIAR LOGIN / REGISTRO


btnToggleAuth.addEventListener('click', () => {

    modoRegistro = !modoRegistro;

    authMessage.textContent = '';
    authMessage.className = 'message';

    if (modoRegistro) {

        authTitle.textContent =
            'Crear cuenta';

        authDescription.textContent =
            'Regístrate para comenzar a comprar.';

        authButtonText.textContent =
            'Registrarme';

        btnToggleAuth.textContent =
            '¿Ya tienes cuenta? Inicia sesión';

    } else {

        authTitle.textContent =
            'Iniciar sesión';

        authDescription.textContent =
            'Ingresa para realizar compras.';

        authButtonText.textContent =
            'Iniciar sesión';

        btnToggleAuth.textContent =
            '¿No tienes cuenta? Regístrate';

    }

});



// LOGIN / REGISTRO


authForm.addEventListener('submit', async (event) => {

    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {

        mostrarMensajeAuth(
            'Completa todos los campos.',
            'error'
        );

        return;
    }


    try {

        if (modoRegistro) {

            await registrar(email, password);

        } else {

            await login(email, password);

        }

    } catch (error) {

        mostrarMensajeAuth(
            error.message,
            'error'
        );

    }

});



// REGISTRAR


async function registrar(email, password) {

    const response = await fetch(
        `${API_URL}/auth/registrar`,
        {
            method: 'POST',

            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify({
                email,
                password
            })
        }
    );


    const data = await response.json();


    if (!response.ok) {

        throw new Error(
            data.error || 'No se pudo registrar el usuario.'
        );

    }


    mostrarMensajeAuth(
        'Usuario registrado correctamente. Ahora puedes iniciar sesión.',
        'success'
    );


    modoRegistro = false;

    authTitle.textContent =
        'Iniciar sesión';

    authDescription.textContent =
        'Ingresa para realizar compras.';

    authButtonText.textContent =
        'Iniciar sesión';

    btnToggleAuth.textContent =
        '¿No tienes cuenta? Regístrate';

}



// LOGIN


async function login(email, password) {

    const response = await fetch(
        `${API_URL}/auth/login`,
        {
            method: 'POST',

            headers: {
                'Content-Type': 'application/json'
            },

            body: JSON.stringify({
                email,
                password
            })
        }
    );


    const data = await response.json();


    if (!response.ok) {

        throw new Error(
            data.error || 'Credenciales inválidas.'
        );

    }


    guardarSesion(
        data.token,
        email
    );


    // Obtener información del usuario
    const usuarioToken = decodificarToken(data.token);

    localStorage.setItem(
        'usuario',
        JSON.stringify(usuarioToken)
    );


    mostrarTienda();

}



// DECODIFICAR JWT


function decodificarToken(token) {

    try {

        const payload = token.split('.')[1];

        const decodedPayload =
            atob(
                payload
                    .replace(/-/g, '+')
                    .replace(/_/g, '/')
            );

        return JSON.parse(decodedPayload);

    } catch (error) {

        return null;

    }

}



// MOSTRAR TIENDA


function mostrarTienda() {

    authSection.classList.add('hidden');

    storeSection.classList.remove('hidden');

    usuarioInfo.classList.remove('hidden');

    const email =
        localStorage.getItem('email');

    usuarioEmail.textContent =
        email || 'Usuario';

    cargarProductos();

    cargarPedidos();

}



// MOSTRAR LOGIN


function mostrarLogin() {

    authSection.classList.remove('hidden');

    storeSection.classList.add('hidden');

    usuarioInfo.classList.add('hidden');

    emailInput.value = '';
    passwordInput.value = '';

}



// MENSAJES DEL LOGIN


function mostrarMensajeAuth(
    mensaje,
    tipo
) {

    authMessage.textContent =
        mensaje;

    authMessage.className =
        `message ${tipo}`;

}



// CARGAR PRODUCTOS


async function cargarProductos() {

    productsContainer.innerHTML =
        '<p>Cargando productos...</p>';


    try {

        const response = await fetch(
            `${API_URL}/productos`
        );


        const productos =
            await response.json();


        if (!response.ok) {

            throw new Error(
                productos.error ||
                'No se pudieron cargar los productos.'
            );

        }


        productsContainer.innerHTML = '';


        productos.forEach(producto => {

            const card =
                document.createElement('div');

            card.className =
                'product-card';


            const icono =
                producto.nombre
                    .toLowerCase()
                    .includes('zapato')
                    ? '👟'
                    : '👕';


            card.innerHTML = `

                <div class="product-icon">
                    ${icono}
                </div>

                <h3>
                    ${producto.nombre}
                </h3>

                <div class="product-price">
                    $${formatearPrecio(producto.precio)}
                </div>

                <div class="product-stock">
                    Stock disponible:
                    <strong>
                        ${producto.stock}
                    </strong>
                </div>

                <button
                    class="btn btn-buy"
                    onclick="comprarProducto(${producto.id})"
                    ${producto.stock <= 0 ? 'disabled' : ''}
                >
                    ${producto.stock > 0
                        ? 'Comprar'
                        : 'Agotado'}
                </button>

            `;


            productsContainer.appendChild(card);

        });


    } catch (error) {

        productsContainer.innerHTML = `

            <p class="message error">
                ${error.message}
            </p>

        `;

    }

}



// FORMATEAR PRECIO


function formatearPrecio(precio) {

    return Number(precio).toLocaleString(
        'es-CO'
    );

}



// COMPRAR PRODUCTO


async function comprarProducto(productoId) {

    const token =
        obtenerToken();


    if (!token) {

        mostrarNotificacion(
            'Debes iniciar sesión.',
            'error'
        );

        mostrarLogin();

        return;
    }


    const confirmar =
        confirm(
            '¿Deseas comprar 1 unidad de este producto?'
        );


    if (!confirmar) {
        return;
    }


    try {

        const response = await fetch(
            `${API_URL}/pedidos/comprar`,
            {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json',

                    'Authorization':
                        `Bearer ${token}`
                },

                body: JSON.stringify({
                    producto_id: productoId,
                    cantidad: 1
                })
            }
        );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.error ||
                'No se pudo realizar la compra.'
            );

        }


        mostrarNotificacion(
            `Compra realizada correctamente. Pedido #${data.id}`,
            'success'
        );


        // Actualizar productos
        await cargarProductos();

        // Actualizar pedidos
        await cargarPedidos();


    } catch (error) {

        mostrarNotificacion(
            error.message,
            'error'
        );

    }

}



// CARGAR PEDIDOS


async function cargarPedidos() {

    const token =
        obtenerToken();


    const usuario =
        JSON.parse(
            localStorage.getItem('usuario')
        );


    if (!token || !usuario) {

        return;

    }


    ordersContainer.innerHTML =
        '<p>Cargando pedidos...</p>';


    try {

        const response = await fetch(
            `${API_URL}/pedidos/usuario/${usuario.id}`,
            {
                headers: {
                    'Authorization':
                        `Bearer ${token}`
                }
            }
        );


        const pedidos =
            await response.json();


        if (!response.ok) {

            throw new Error(
                pedidos.error ||
                'No se pudieron cargar los pedidos.'
            );

        }


        if (pedidos.length === 0) {

            ordersContainer.innerHTML = `

                <div class="no-orders">
                    Todavía no tienes pedidos.
                </div>

            `;

            return;

        }


        ordersContainer.innerHTML = '';


        pedidos.forEach(pedido => {

            const order =
                document.createElement('div');

            order.className =
                'order-card';


            order.innerHTML = `

                <strong>
                    Pedido #${pedido.id}
                </strong>

                <div>
                    Producto:
                    ${pedido.producto_id}
                </div>

                <div>
                    Cantidad:
                    ${pedido.cantidad}
                </div>

                <div>
                    Estado:
                    <span class="order-status">
                        ${pedido.estado}
                    </span>
                </div>

                <div>
                    Fecha:
                    ${pedido.fecha}
                </div>

            `;


            ordersContainer.appendChild(order);

        });


    } catch (error) {

        ordersContainer.innerHTML = `

            <p class="message error">
                ${error.message}
            </p>

        `;

    }

}



// BOTONES


btnLogout.addEventListener(
    'click',
    cerrarSesion
);


btnRefreshOrders.addEventListener(
    'click',
    cargarPedidos
);



// COMPROBAR SESIÓN AL CARGAR


function comprobarSesion() {

    const token =
        obtenerToken();

    const email =
        localStorage.getItem('email');


    if (token && email) {

        const usuario =
            decodificarToken(token);


        if (usuario) {

            localStorage.setItem(
                'usuario',
                JSON.stringify(usuario)
            );

            mostrarTienda();

            return;

        }

    }


    mostrarLogin();

}



// INICIAR APLICACIÓN


comprobarSesion();