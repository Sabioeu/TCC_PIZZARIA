package com.integrador.api.pizza.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class FornecedorDTO {
    private String nome;
    private String cnpjCpf;
    private String telefone;
    private String email;
    private String endereco;
}