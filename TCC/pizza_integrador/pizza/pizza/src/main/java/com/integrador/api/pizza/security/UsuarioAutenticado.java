package com.integrador.api.pizza.security;
import com.integrador.api.pizza.model.Usuario;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.userdetails.User;
public class UsuarioAutenticado extends User {
    private final Long id;
    private final String hashSenha;
    public UsuarioAutenticado(Usuario usuario) { super(usuario.getEmail(),usuario.getSenha(),usuario.acessoLiberado(),true,true,true,AuthorityUtils.createAuthorityList("ROLE_"+usuario.getPerfil().name())); id=usuario.getId(); hashSenha=usuario.getSenha(); }
    String hashOriginal() { return hashSenha; }
    public Long getId() { return id; }
}
