// src/main/java/com/integrador/api/pizza/dto/ClienteCadastroDTO.java
package com.integrador.api.pizza.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor; // Adicione se não tiver

@Getter
@Setter
@NoArgsConstructor // Adicione se não tiver. Ou @AllArgsConstructor se preferir.
public class ClienteCadastroDTO {

    @NotBlank(message = "O nome é obrigatório")
    @Size(max = 100, message = "O nome não pode ter mais de 100 caracteres")
    private String nome;

    @NotBlank(message = "O CPF é obrigatório")
    @Size(min = 11, max = 11, message = "O CPF deve ter 11 caracteres") // Adicione validação para CPF
    private String cpf; // DEVE SER CPF, NÃO RG

    @NotBlank(message = "O telefone é obrigatório")
    @Size(max = 20, message = "O telefone não pode ter mais de 20 caracteres")
    private String telefone;

    @NotBlank(message = "O endereço é obrigatório")
    @Size(max = 255, message = "O endereço não pode ter mais de 255 caracteres")
    private String endereco;
}