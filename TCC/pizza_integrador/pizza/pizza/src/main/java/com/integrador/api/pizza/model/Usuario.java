package com.integrador.api.pizza.model;

import com.integrador.api.pizza.enums.PerfilUsuario; // Certifique-se de importar o enum
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.EqualsAndHashCode;

@Setter
@Getter
@Entity
@Table(name = "usuarios")
@NoArgsConstructor
@AllArgsConstructor // Este construtor vai ter Long id, String nome, String email, String senha, PerfilUsuario perfil
@EqualsAndHashCode(of = "id")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "nome_usuario", nullable = false, length = 100)
    private String nome;

    @Column(name = "email_usuario", nullable = false, unique = true, length = 100)
    private String email;

    @Column(name = "senha_usuario", nullable = false, length = 255) // Aumente o tamanho para a senha criptografada
    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.WRITE_ONLY)
    private String senha;

    @Enumerated(EnumType.STRING) // Armazena o nome da enum como String (ex: "ADMINISTRADOR")
    @Column(name = "perfil_usuario", nullable = false)
    private PerfilUsuario perfil;
    private Boolean ativo = true;
    public boolean acessoLiberado() { return !Boolean.FALSE.equals(ativo); }

    // ADICIONE ESTE CONSTRUTOR ABAIXO para resolver o problema no UsuarioService:
    // Construtor sem ID (útil para criar novos usuários a partir do DTO)
    public Usuario(String nome, String email, String senha, PerfilUsuario perfil) {
        this.nome = nome;
        this.email = email;
        this.senha = senha;
        this.perfil = perfil;
    }
}
