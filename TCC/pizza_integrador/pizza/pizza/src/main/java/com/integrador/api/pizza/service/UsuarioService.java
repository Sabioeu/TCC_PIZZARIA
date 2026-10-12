package com.integrador.api.pizza.service;

import com.integrador.api.pizza.dto.UsuarioCadastroDTO;
import com.integrador.api.pizza.model.Usuario;
import com.integrador.api.pizza.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder; // Adicione este import
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class UsuarioService {

    @Autowired
    private UsuarioRepository repository;

    private BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder(); // Instancia o encoder

    @Transactional
    public Usuario cadastrarUsuario(UsuarioCadastroDTO dados) {
        validarSenha(dados.getSenha(), true);
        // Criptografar a senha antes de salvar
        String senhaCriptografada = passwordEncoder.encode(dados.getSenha());
        Usuario usuario = new Usuario(
                dados.getNome(),
                dados.getEmail(),
                senhaCriptografada, // Senha criptografada
                dados.getPerfil()
        );

        usuario.setEmail(dados.getEmail().trim().toLowerCase(java.util.Locale.ROOT));
        usuario.setAtivo(!Boolean.FALSE.equals(dados.getAtivo()));
        var existente = repository.findByEmailIgnoreCase(usuario.getEmail());
        if (existente.isPresent()) {
            throw new IllegalArgumentException("Usuário já cadastrado com o email: " + dados.getEmail() + ". Por favor, utilize outro email.");
        }

        return repository.save(usuario);
    }

    public List<Usuario> listarTodos() {
        return repository.findAll();
    }

    public Optional<Usuario> buscarPorId(Long id) {
        return repository.findById(id);
    }

    @Transactional
    public Usuario atualizarUsuario(Long id, UsuarioCadastroDTO dados) {
        validarSenha(dados.getSenha(), false);
        var administradores=repository.bloquearAdministradores();
        return repository.findById(id).map(usuarioExistente -> {
            if (Boolean.FALSE.equals(dados.getAtivo()) && usuarioExistente.getPerfil()==com.integrador.api.pizza.enums.PerfilUsuario.ADMINISTRADOR && usuarioExistente.acessoLiberado() && administradores.stream().filter(Usuario::acessoLiberado).count()<=1) throw new IllegalArgumentException("Mantenha pelo menos um administrador ativo.");
            var autenticacao=org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if (Boolean.FALSE.equals(dados.getAtivo()) && autenticacao!=null && autenticacao.getPrincipal() instanceof com.integrador.api.pizza.security.UsuarioAutenticado u && u.getId().equals(id)) throw new IllegalArgumentException("Não é permitido desativar sua própria conta.");
            if(usuarioExistente.getPerfil()==com.integrador.api.pizza.enums.PerfilUsuario.ADMINISTRADOR && administradores.stream().filter(Usuario::acessoLiberado).count()<=1 && dados.getPerfil()!=com.integrador.api.pizza.enums.PerfilUsuario.ADMINISTRADOR) throw new IllegalArgumentException("Mantenha pelo menos um administrador.");
            var atual=org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
            if(atual!=null && atual.getPrincipal() instanceof com.integrador.api.pizza.security.UsuarioAutenticado u && u.getId().equals(id) && dados.getPerfil()!=com.integrador.api.pizza.enums.PerfilUsuario.ADMINISTRADOR) throw new IllegalArgumentException("Não é permitido remover seu próprio acesso de administrador.");
            repository.findByEmailIgnoreCase(dados.getEmail().trim()).filter(u -> !u.getId().equals(id)).ifPresent(u -> { throw new IllegalArgumentException("E-mail já cadastrado."); });
            usuarioExistente.setNome(dados.getNome());
            usuarioExistente.setEmail(dados.getEmail().trim().toLowerCase(java.util.Locale.ROOT));
            // Atualizar senha apenas se uma nova for fornecida
            if (dados.getSenha() != null && !dados.getSenha().isEmpty()) {
                usuarioExistente.setSenha(passwordEncoder.encode(dados.getSenha()));
            }
            usuarioExistente.setPerfil(dados.getPerfil());
            if(dados.getAtivo()!=null) usuarioExistente.setAtivo(dados.getAtivo());
            return repository.save(usuarioExistente);
        }).orElseThrow(() -> new IllegalArgumentException("Usuário não encontrado com ID: " + id));
    }

    @Transactional
    public void deletarUsuario(Long id) {
        var administradores=repository.bloquearAdministradores();
        if(administradores.stream().filter(Usuario::acessoLiberado).count()<=1 && administradores.stream().anyMatch(u -> u.getId().equals(id))) throw new IllegalArgumentException("O último administrador não pode ser excluído.");
        var atual=org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if(atual!=null && atual.getPrincipal() instanceof com.integrador.api.pizza.security.UsuarioAutenticado u && u.getId().equals(id)) throw new IllegalArgumentException("Não é permitido excluir sua própria conta.");
        repository.deleteById(id);
    }
    private void validarSenha(String senha, boolean obrigatoria) {
        if (!obrigatoria && (senha == null || senha.isEmpty())) return;
        if (senha == null || senha.length()<8 || senha.getBytes(java.nio.charset.StandardCharsets.UTF_8).length>72) throw new IllegalArgumentException("Use uma senha com pelo menos 8 caracteres e até 72 bytes.");
    }
}
