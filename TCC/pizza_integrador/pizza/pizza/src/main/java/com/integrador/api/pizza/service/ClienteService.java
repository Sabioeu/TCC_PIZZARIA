// src/main/java/com/integrador/api/pizza/service/ClienteService.java
package com.integrador.api.pizza.service;

import com.integrador.api.pizza.dto.ClienteCadastroDTO;
import com.integrador.api.pizza.model.Cliente;
import com.integrador.api.pizza.repository.ClienteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class ClienteService {

    @Autowired
    private ClienteRepository clienteRepository;

    @Transactional
    public Cliente cadastrarCliente(ClienteCadastroDTO dados) {
        // Crie uma nova instância de Cliente usando o construtor padrão (sem argumentos)
        Cliente cliente = new Cliente();

        // Defina os valores dos campos usando os setters
        cliente.setNome(dados.getNome());
        cliente.setCpf(dados.getCpf()); // <-- Use o CPF
        cliente.setTelefone(dados.getTelefone());
        cliente.setEndereco(dados.getEndereco());

        // Salva a entidade Cliente no banco de dados
        return clienteRepository.save(cliente);
    }

    public List<Cliente> listarTodos() {
        return clienteRepository.findAll();
    }

    public Optional<Cliente> buscarPorId(Long id) {
        return clienteRepository.findById(id);
    }

    @Transactional
    public Cliente atualizarCliente(Long id, ClienteCadastroDTO dados) {
        return clienteRepository.findById(id).map(clienteExistente -> {
            clienteExistente.setNome(dados.getNome());
            clienteExistente.setCpf(dados.getCpf());
            clienteExistente.setEndereco(dados.getEndereco());
            clienteExistente.setTelefone(dados.getTelefone());
            return clienteRepository.save(clienteExistente);
        }).orElseThrow(() -> new IllegalArgumentException("Cliente não encontrado com ID: " + id));
    }

    public void deletarCliente(Long id) {
        clienteRepository.deleteById(id);
    }
}
