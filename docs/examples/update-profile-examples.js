/**
 * Script de prueba para la actualización de perfil
 * 
 * Este script demuestra cómo usar la API de actualización de perfil
 * desde el frontend o cualquier cliente HTTP.
 */

// Configuración
const API_BASE_URL = 'http://localhost:3000';
const JWT_TOKEN = 'YOUR_JWT_TOKEN_HERE'; // Reemplazar con un token válido

/**
 * Ejemplo 1: Actualizar solo información de texto
 */
async function updateProfileInfo() {
    const formData = new FormData();
    formData.append('name', 'Anthony Cursewl');
    formData.append('username', 'anthonycursewl');

    try {
        const response = await fetch(`${API_BASE_URL}/users/profile/update`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${JWT_TOKEN}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Perfil actualizado:', data);
        return data;
    } catch (error) {
        console.error('Error actualizando perfil:', error);
        throw error;
    }
}

/**
 * Ejemplo 2: Actualizar solo el avatar
 */
async function updateAvatar(avatarFile) {
    const formData = new FormData();
    formData.append('avatar', avatarFile);

    try {
        const response = await fetch(`${API_BASE_URL}/users/profile/update`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${JWT_TOKEN}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Avatar actualizado:', data);
        return data;
    } catch (error) {
        console.error('Error actualizando avatar:', error);
        throw error;
    }
}

/**
 * Ejemplo 3: Actualizar todo (nombre, username, avatar y banner)
 */
async function updateFullProfile(avatarFile, bannerFile) {
    const formData = new FormData();
    formData.append('name', 'Anthony Cursewl');
    formData.append('username', 'anthonycursewl');
    formData.append('avatar', avatarFile);
    formData.append('banner', bannerFile);

    try {
        const response = await fetch(`${API_BASE_URL}/users/profile/update`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${JWT_TOKEN}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Perfil completo actualizado:', data);
        return data;
    } catch (error) {
        console.error('Error actualizando perfil completo:', error);
        throw error;
    }
}

/**
 * Ejemplo 4: Uso con input file en HTML
 */
function setupFileInputs() {
    // HTML necesario:
    // <input type="file" id="avatarInput" accept="image/*">
    // <input type="file" id="bannerInput" accept="image/*">
    // <button id="updateBtn">Actualizar Perfil</button>

    const avatarInput = document.getElementById('avatarInput');
    const bannerInput = document.getElementById('bannerInput');
    const updateBtn = document.getElementById('updateBtn');

    updateBtn.addEventListener('click', async () => {
        const formData = new FormData();

        if (avatarInput.files[0]) {
            formData.append('avatar', avatarInput.files[0]);
        }

        if (bannerInput.files[0]) {
            formData.append('banner', bannerInput.files[0]);
        }

        try {
            const response = await fetch(`${API_BASE_URL}/users/profile/update`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${JWT_TOKEN}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Perfil actualizado:', data);
            alert('Perfil actualizado exitosamente!');
        } catch (error) {
            console.error('Error:', error);
            alert('Error actualizando perfil');
        }
    });
}

/**
 * Ejemplo 5: Uso con React
 */
function ReactExample() {
    const [avatar, setAvatar] = React.useState(null);
    const [banner, setBanner] = React.useState(null);
    const [name, setName] = React.useState('');
    const [username, setUsername] = React.useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        const formData = new FormData();
        if (name) formData.append('name', name);
        if (username) formData.append('username', username);
        if (avatar) formData.append('avatar', avatar);
        if (banner) formData.append('banner', banner);

        try {
            const response = await fetch(`${API_BASE_URL}/users/profile/update`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${JWT_TOKEN}`
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Perfil actualizado:', data);
        } catch (error) {
            console.error('Error:', error);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <input
                type="text"
                placeholder="Nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
            />
            <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
            />
            <input
                type="file"
                accept="image/*"
                onChange={(e) => setAvatar(e.target.files[0])}
            />
            <input
                type="file"
                accept="image/*"
                onChange={(e) => setBanner(e.target.files[0])}
            />
            <button type="submit">Actualizar Perfil</button>
        </form>
    );
}

/**
 * Ejemplo 6: Uso con cURL (para testing desde terminal)
 */
const curlExample = `
# Actualizar solo nombre y username
curl -X PUT http://localhost:3000/users/profile/update \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -F "name=Anthony Cursewl" \\
  -F "username=anthonycursewl"

# Actualizar con avatar
curl -X PUT http://localhost:3000/users/profile/update \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -F "avatar=@/path/to/avatar.jpg"

# Actualizar todo
curl -X PUT http://localhost:3000/users/profile/update \\
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  -F "name=Anthony Cursewl" \\
  -F "username=anthonycursewl" \\
  -F "avatar=@/path/to/avatar.jpg" \\
  -F "banner=@/path/to/banner.jpg"
`;

console.log('Ejemplos de cURL:', curlExample);

// Exportar funciones para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        updateProfileInfo,
        updateAvatar,
        updateFullProfile,
        setupFileInputs
    };
}
