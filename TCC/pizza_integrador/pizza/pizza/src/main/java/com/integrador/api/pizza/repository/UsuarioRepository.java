package com.integrador.api.pizza.repository;

import com.integrador.api.pizza.model.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional; // Importar Optional, se você precisar de métodos que retornem Optional

@Repository
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    // Exemplo de método de busca personalizado, útil para autenticação
    Optional<Usuario> findByEmail(String email);
    Optional<Usuario> findByEmailIgnoreCase(String email);
    boolean existsByPerfil(com.integrador.api.pizza.enums.PerfilUsuario perfil);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select u from Usuario u where u.perfil = com.integrador.api.pizza.enums.PerfilUsuario.ADMINISTRADOR order by u.id")
    java.util.List<Usuario> bloquearAdministradores();
}
