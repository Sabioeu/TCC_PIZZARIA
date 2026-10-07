package com.integrador.api.pizza.service;
import com.integrador.api.pizza.repository.UsuarioRepository;
import com.integrador.api.pizza.model.Usuario;
import com.integrador.api.pizza.security.UsuarioAutenticado;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
@Service
public class SessaoService {
    private final UsuarioRepository usuarios;
    public SessaoService(UsuarioRepository usuarios) { this.usuarios=usuarios; }
    public Usuario usuarioAtual() {
        var auth=SecurityContextHolder.getContext().getAuthentication();
        if(auth==null || !(auth.getPrincipal() instanceof UsuarioAutenticado u)) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Sessão expirada.");
        return usuarios.findById(u.getId()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Sessão expirada."));
    }
}
