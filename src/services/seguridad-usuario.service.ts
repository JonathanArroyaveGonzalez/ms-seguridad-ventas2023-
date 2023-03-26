import {injectable, /* inject, */ BindingScope} from '@loopback/core';
import {repository} from '@loopback/repository';
import {ConfiguracionSeguridad} from '../config/seguridad.config';
import {Credenciales, FactorDeAutenticacionPorCodigo, Login, Usuario} from '../models';
import {LoginRepository, UsuarioRepository} from '../repositories';
const generator = require('generate-password');
const MD5 = require('crypto-js/md5');
const jwt = require('jsonwebtoken');


@injectable({scope: BindingScope.TRANSIENT})
export class SeguridadUsuarioService {
  constructor(
    @repository(UsuarioRepository)
    public repositorioUsuario: UsuarioRepository,
    @repository(LoginRepository)
    public repositorioLogin: LoginRepository
  ) {}

  /**
   * crear clave aleatoria
   * @returns cadena aleatoria de n caracteres
   */
  crearTextoAleatorio(n:number): string{
    let clave = generator.generate({
      length: 10,
      numbers: true
    });
    return clave;
  }

  /**
   *cifrar una cadena con metodo MD5
   * @param cadena texto a cifrar
   * @returns cadena cifrada con MD5
   */
  cifrarTexto(cadena: string): string{
    let cadenaCifrada = MD5(cadena).toString();
    return cadenaCifrada;
  }

  /**
   * Se busca un usuario por sus credenciales de acceso
   * @param credenciales credenciales del usuario
   * @returns usuario encontrado o null
   */
  async identificarUsuario(credenciales:Credenciales): Promise<Usuario | null>{
    let usuario = await this.repositorioUsuario.findOne({
      where: {
        correo: credenciales.correo,
        clave: credenciales.clave
      }
    });
    return usuario as Usuario;
  }
  /**
   * valida un codigo del 2fa para un usuario
   * @param credenciales2fa credenciales del usuario con el codigo del 2fa
   * @returns registro de login o null
   */
  async validarCodigo2fa(credenciales2fa: FactorDeAutenticacionPorCodigo): Promise <Usuario | null >{
    let login = await this.repositorioLogin.findOne({
      where:{
        usuarioId: credenciales2fa.usuarioId,
        codigo2fa: credenciales2fa.codigo2fa,
        estadoCodigo2fa: false
      }
    });
    if(login){
      let usuario = await this.repositorioUsuario.findById(credenciales2fa.usuarioId);
      return usuario;
    }else{
      return null;
    }
  }

  /**
   * generacion del jwt
   * @param usuario Informacion del usuario
   * @returns token
   */
  crearToken(usuario: Usuario): string {
    let datos = {
      name: `${usuario.primerNombre} ${usuario.segundoNombre} ${usuario.primerApellido} ${usuario.segundoApellido}`,
      rol: usuario.rolId,
      email: usuario.correo
    }
    let token = jwt.sign(datos, ConfiguracionSeguridad.claveJWT);
    return token;
  }

  /**
   * valida y obrtiene el rol de un token
   * @param tk el token
   * @returns el id del rol
   */
  obtenerRolDesdeToken(tk: string): string{
    let obj = jwt.verify(tk, ConfiguracionSeguridad.claveJWT);
    return obj.rol;
  }
}
