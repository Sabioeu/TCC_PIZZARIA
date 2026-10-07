package com.integrador.api.pizza.config;
import com.integrador.api.pizza.enums.PerfilUsuario;
import com.integrador.api.pizza.model.Usuario;
import com.integrador.api.pizza.repository.UsuarioRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
@Component
public class AdminInicial implements ApplicationRunner {
    private final UsuarioRepository usuarios; private final PasswordEncoder encoder;
    @Value("${PIZZA_ADMIN_EMAIL:}") private String email;
    @Value("${PIZZA_ADMIN_SENHA:}") private String senha;
    public AdminInicial(UsuarioRepository usuarios,PasswordEncoder encoder) { this.usuarios=usuarios; this.encoder=encoder; }
    @Override @Transactional public void run(ApplicationArguments args) {
        if(usuarios.existsByPerfil(PerfilUsuario.ADMINISTRADOR) || email.isBlank()) return;
        if(!email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$") || email.length()>100 || senha.length()<12 || senha.getBytes(java.nio.charset.StandardCharsets.UTF_8).length>72) throw new IllegalArgumentException("Administrador inicial: informe e-mail válido e senha de 12 a 72 caracteres no terminal.");
        String normalizado=email.trim().toLowerCase(java.util.Locale.ROOT);
        if(usuarios.findByEmailIgnoreCase(normalizado).isPresent()) throw new IllegalArgumentException("Administrador inicial: utilize um e-mail diferente da conta existente.");
        usuarios.save(new Usuario("Administrador",normalizado,encoder.encode(senha),PerfilUsuario.ADMINISTRADOR));
    }
}
