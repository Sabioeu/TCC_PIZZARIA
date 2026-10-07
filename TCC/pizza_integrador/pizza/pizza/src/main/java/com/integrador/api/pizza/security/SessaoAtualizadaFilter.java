package com.integrador.api.pizza.security;
import com.integrador.api.pizza.repository.UsuarioRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.filter.OncePerRequestFilter;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;

/** Revoga sessões de contas excluídas e atualiza permissões após mudança de perfil. */
public class SessaoAtualizadaFilter extends OncePerRequestFilter {
    private final UsuarioRepository usuarios;
    public SessaoAtualizadaFilter(UsuarioRepository usuarios) { this.usuarios=usuarios; }
    @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain) throws ServletException,IOException {
        var auth=SecurityContextHolder.getContext().getAuthentication();
        if(auth!=null && auth.getPrincipal() instanceof UsuarioAutenticado anterior) {
            var usuario=usuarios.findById(anterior.getId());
            // O hash é preservado no principal para invalidar sessões após troca de senha.
            if(usuario.isEmpty() || !java.util.Objects.equals(usuario.get().getSenha(),anterior.hashOriginal())) {
                SecurityContextHolder.clearContext(); if(req.getSession(false)!=null) req.getSession(false).invalidate();
            } else {
                var atual=new UsuarioAutenticado(usuario.get());
                SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(atual,null,atual.getAuthorities()));
            }
        }
        chain.doFilter(req,res);
    }
}
