package com.integrador.api.pizza.dto;
import com.integrador.api.pizza.enums.EtapaAtendimento;
import jakarta.validation.constraints.NotNull;
public record EtapaAtendimentoDTO(@NotNull EtapaAtendimento etapa) {}
