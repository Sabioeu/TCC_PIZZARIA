package com.integrador.api.pizza.service;

import com.integrador.api.pizza.enums.StatusMesa;
import com.integrador.api.pizza.model.Mesa;
import com.integrador.api.pizza.repository.MesaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class MesaService {

    @Autowired
    private MesaRepository repository;

    /**
     * Retorna todas as mesas para o mapa do Front-end
     */
    public List<Mesa> listarTodas() {
        return repository.findAll();
    }

    /**
     * Cria uma nova mesa enviada pelo formulário do React
     */
    @Transactional
    public Mesa criar(Mesa mesa) {
        // Garante valores padrão caso não venham no JSON
        if (mesa.getStatus() == null) {
            mesa.setStatus(StatusMesa.DISPONIVEL);
        }
        if (mesa.getAtivo() == null) {
            mesa.setAtivo(true);
        }
        return repository.save(mesa);
    }

    /**
     * Atualiza o status de ativação ou disponibilidade da mesa
     */
    @Transactional
    public Mesa atualizar(Long id, Mesa dadosNovos) {
        return repository.findById(id).map(mesa -> {
            mesa.setNumero(dadosNovos.getNumero());

            // CORREÇÃO AQUI: Como seu Model usa 'Boolean' (Wrapper),
            // o Lombok gera 'getAtivo()' em vez de 'isAtivo()'.
            mesa.setAtivo(dadosNovos.getAtivo());

            mesa.setStatus(dadosNovos.getStatus());
            mesa.setCapacidade(dadosNovos.getCapacidade());

            return repository.save(mesa);
        }).orElseThrow(() -> new RuntimeException("Mesa não encontrada com ID: " + id));
    }

    /**
     * Busca uma mesa específica por ID
     */
    public Mesa buscarPorId(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Mesa não encontrada"));
    }
}