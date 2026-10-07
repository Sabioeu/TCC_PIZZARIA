package com.integrador.api.pizza.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class RegistroDTO {
    @NotBlank @Email @Size(max=100) private String email;
    @NotBlank @Size(min=8,max=72) private String senha;
    @NotBlank @Size(max=72) private String confirmarSenha;
}
