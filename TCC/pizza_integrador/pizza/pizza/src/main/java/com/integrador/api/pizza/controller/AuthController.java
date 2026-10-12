package com.integrador.api.pizza.controller;
import com.integrador.api.pizza.dto.UsuarioResponseDTO;
import com.integrador.api.pizza.enums.PerfilUsuario;
import com.integrador.api.pizza.repository.UsuarioRepository;
import com.integrador.api.pizza.service.SessaoService;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final com.integrador.api.pizza.service.UsuarioService cadastro;
    private final SessaoService sessao; private final UsuarioRepository usuarios;
    public AuthController(SessaoService sessao,UsuarioRepository usuarios,com.integrador.api.pizza.service.UsuarioService cadastro) { this.sessao=sessao; this.usuarios=usuarios; this.cadastro=cadastro; }
    @PostMapping("/registro")
    @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    public UsuarioResponseDTO registrar(@jakarta.validation.Valid @RequestBody com.integrador.api.pizza.dto.RegistroDTO dados) {
        if (!dados.getSenha().equals(dados.getConfirmarSenha())) throw new IllegalArgumentException("As senhas não coincidem.");
        var usuario=new com.integrador.api.pizza.dto.UsuarioCadastroDTO();
        usuario.setEmail(dados.getEmail()); usuario.setNome(dados.getEmail().trim().split("@",2)[0]);
        usuario.setSenha(dados.getSenha()); usuario.setPerfil(PerfilUsuario.ATENDENTE);
        usuario.setAtivo(false);
        return new UsuarioResponseDTO(cadastro.cadastrarUsuario(usuario));
    }
    @GetMapping("/me") public UsuarioResponseDTO atual() { return new UsuarioResponseDTO(sessao.usuarioAtual()); }
    @GetMapping("/csrf") public Map<String,String> csrf(CsrfToken token) { return Map.of("token",token.getToken(),"headerName",token.getHeaderName()); }
    @GetMapping("/config") public Map<String,Boolean> config() { return Map.of("precisaAdministrador",!usuarios.existsByPerfil(PerfilUsuario.ADMINISTRADOR)); }
}
