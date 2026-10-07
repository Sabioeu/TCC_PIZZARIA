package com.integrador.api.pizza.dto;

import com.integrador.api.pizza.enums.PerfilUsuario;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class UsuarioCadastroDTO {
    public interface Novo extends jakarta.validation.groups.Default {}
    @NotBlank(message = "O nome é obrigatório") @Size(max = 100, message = "O nome não pode ter mais de 100 caracteres") private String nome;
    @NotBlank(message = "O email é obrigatório") @Email(message = "Formato de email inválido") @Size(max = 100, message = "O email não pode ter mais de 100 caracteres") private String email;
    @NotBlank(groups = Novo.class, message = "A senha é obrigatória") @Size(min = 8, max = 72, message = "A senha deve ter entre 8 e 72 caracteres") private String senha;
    @NotNull(message = "O perfil é obrigatório") private PerfilUsuario perfil;
}
