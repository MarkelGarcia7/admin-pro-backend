const { response } = require('express');
const bcryptjs = require('bcryptjs') 

const Usuario = require('../models/usuario');
const { generarJWT } = require('../helpers/jwt');

const getUsuarios = async( req, res ) => {

    const desde = Number(req.query.desde)  || 0;

    /* esto lo que hace es empezar desde el numero introducido en el desde (skip) y 
    luego limitar a 5 busquedas (limit), este código y el de abajo es lo mismo pero 
    el de abajo es mas eficiente ya que no tiene 2 await */
    
    /* const usuarios = await Usuario
                            .find({}, 'nombre email role google')
                            .skip( desde )
                            .limit( 5 );

    const total = await Usuario.count(); */

    const [ usuarios, total ] = await Promise.all([
        Usuario
            .find({}, 'nombre email role google img')
            .skip( desde )
            .limit( 5 ),

        Usuario.countDocuments()
    ])

    res.json({
        ok: true,
        usuarios,
        total
    });
}

const crearUsuario = async( req, res ) => {

    const { email, password } = req.body;

    try {

        const existeEmail = await Usuario.findOne({ email });

        if( existeEmail ) {
            return res.status(400).json({
                ok: false,
                msg: 'El correo ya esta registrado'
            });
        }

        const usuario = new Usuario( req.body );

        /* encriptar contraseña */
        const salt = bcryptjs.genSaltSync();
        usuario.password = bcryptjs.hashSync( password, salt )

        /* guardar usuario */
        await usuario.save();

        /* Generar el token - JsonWebToken */
        const token = await generarJWT( usuario.id );

        res.json({
            ok: true,
            usuario,
            token
    });

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error inesperado... revisar logs'
        });
    }

}

const actualizarUsuario = async (req, res = response) => {

    /*  todo: validar token y comporbar si es el usuario correcto */

    const uid = req.params.id;

    try {

        const usuarioDB = await Usuario.findById( uid );

        if ( !usuarioDB ) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe un usuario por ese id'
            });
        }

        /*  actualizaciones */
        const { password, google, email,  ...campos } = req.body;

        if ( usuarioDB.email !== email ) {

            const existeEmail = await Usuario.findOne({ email });
            if (existeEmail) {
                return res.status(400).json({
                    ok: false,
                    msg: 'Ya existe un usuario con ese email'
                });
            }
        }

        if (!usuarioDB.google) {
            campos.email = email;
        } else if( usuarioDB.email !== email ) {
            return res.status(400).json({
                ok: false,
                msg: 'usuarios de google no pueden cambiar su correo'
            });
        }
        
        const usuarioActualizado = await Usuario.findByIdAndUpdate( uid, campos, { new: true } );

        res.json({
            ok: true,
            usuario: usuarioActualizado
        })

    } catch (error) {
        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Error inesperado'
        })
    }

}

const borrarUsuario = async( req, res = response ) => {

    const uid = req.params.id;

    try {

        /* mirar si existe un usuario en la BD, y si es así buscarlo por el id */
        const usuarioDB = await Usuario.findById( uid );

        if ( !usuarioDB ) {
            return res.status(404).json({
                ok: false,
                msg: 'No existe un usuario por ese id'
            });
        }

        await Usuario.findByIdAndDelete( uid );

        res.json({
            ok: true,
            msg: 'usuario eliminado'
        })
        
    } catch (error) {

        console.log(error);
        res.status(500).json({
            ok: false,
            msg: 'Hable con el administrador'
        })
        
    }

}


module.exports = {
    getUsuarios,
    crearUsuario,
    actualizarUsuario,
    borrarUsuario
}