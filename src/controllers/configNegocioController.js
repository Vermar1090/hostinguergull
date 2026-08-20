const ConfigNegocio = require('../models/ConfigNegocio');
const { sanitize } = require('../utils/helpers');

// Obtener configuración (pública)
const getConfigPublic = async (req, res) => {
    try {
        const config = await ConfigNegocio.getPublic();

        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        console.error('Error al obtener configuración:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener configuración',
            error: error.message
        });
    }
};

// Obtener configuración completa (Admin)
const getConfigFull = async (req, res) => {
    try {
        const config = await ConfigNegocio.get();

        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        console.error('Error al obtener configuración:', error);
        res.status(500).json({
            success: false,
            message: 'Error al obtener configuración',
            error: error.message
        });
    }
};

// Actualizar configuración (Admin)
const updateConfig = async (req, res) => {
    try {
        const {
            logo_url,
            nombre_negocio,
            descripcion,
            whatsapp,
            direccion,
            ciudad,
            departamento,
            pais
        } = req.body;

        const updated = await ConfigNegocio.update({
            logo_url: logo_url !== undefined ? logo_url : undefined,
            nombre_negocio: nombre_negocio ? sanitize(nombre_negocio) : undefined,
            descripcion: descripcion !== undefined ? sanitize(descripcion) : undefined,
            whatsapp: whatsapp !== undefined ? sanitize(whatsapp) : undefined,
            direccion: direccion !== undefined ? sanitize(direccion) : undefined,
            ciudad: ciudad !== undefined ? sanitize(ciudad) : undefined,
            departamento: departamento !== undefined ? sanitize(departamento) : undefined,
            pais: pais !== undefined ? sanitize(pais) : undefined
        });

        if (!updated) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo actualizar la configuración'
            });
        }

        const config = await ConfigNegocio.get();

        res.json({
            success: true,
            message: 'Configuración actualizada exitosamente',
            data: config
        });
    } catch (error) {
        console.error('Error al actualizar configuración:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar configuración',
            error: error.message
        });
    }
};

// Actualizar solo WhatsApp
const updateWhatsapp = async (req, res) => {
    try {
        const { whatsapp } = req.body;

        if (!whatsapp) {
            return res.status(400).json({
                success: false,
                message: 'El número de WhatsApp es requerido'
            });
        }

        const updated = await ConfigNegocio.updateWhatsapp(sanitize(whatsapp));

        if (!updated) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo actualizar el WhatsApp'
            });
        }

        const config = await ConfigNegocio.get();

        res.json({
            success: true,
            message: 'WhatsApp actualizado exitosamente',
            data: { whatsapp: config.whatsapp }
        });
    } catch (error) {
        console.error('Error al actualizar WhatsApp:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar WhatsApp',
            error: error.message
        });
    }
};

// Actualizar solo logo
const updateLogo = async (req, res) => {
    try {
        const { logo_url } = req.body;

        if (!logo_url) {
            return res.status(400).json({
                success: false,
                message: 'La URL del logo es requerida'
            });
        }

        const updated = await ConfigNegocio.updateLogo(logo_url);

        if (!updated) {
            return res.status(400).json({
                success: false,
                message: 'No se pudo actualizar el logo'
            });
        }

        const config = await ConfigNegocio.get();

        res.json({
            success: true,
            message: 'Logo actualizado exitosamente',
            data: { logo_url: config.logo_url }
        });
    } catch (error) {
        console.error('Error al actualizar logo:', error);
        res.status(500).json({
            success: false,
            message: 'Error al actualizar logo',
            error: error.message
        });
    }
};

// Restablecer configuración a valores por defecto (Admin)
const resetConfig = async (req, res) => {
    try {
        await ConfigNegocio.update({
            logo_url: null,
            nombre_negocio: 'GULLA',
            descripcion: 'Sistema de gestión de pedidos',
            whatsapp: null,
            direccion: null,
            ciudad: 'Chinú',
            departamento: 'Córdoba',
            pais: 'Colombia'
        });

        const config = await ConfigNegocio.get();

        res.json({
            success: true,
            message: 'Configuración restablecida a valores por defecto',
            data: config
        });
    } catch (error) {
        console.error('Error al restablecer configuración:', error);
        res.status(500).json({
            success: false,
            message: 'Error al restablecer configuración',
            error: error.message
        });
    }
};

module.exports = {
    getConfigPublic,
    getConfigFull,
    updateConfig,
    updateWhatsapp,
    updateLogo,
    resetConfig
};