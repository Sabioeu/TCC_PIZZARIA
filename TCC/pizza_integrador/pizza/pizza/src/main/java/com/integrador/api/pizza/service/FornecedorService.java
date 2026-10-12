package com.integrador.api.pizza.service;

import com.integrador.api.pizza.model.Fornecedor;
import com.integrador.api.pizza.repository.FornecedorRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class FornecedorService {

    @Autowired
    private FornecedorRepository repository;

    public List<Fornecedor> listarTodos() {
        return repository.findAll();
    }

    // Solução para o erro "cannot find symbol"
    public List<Fornecedor> listarAtivos() {
        return repository.findByAtivoTrue();
    }

    public Fornecedor buscarPorId(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Fornecedor não encontrado"));
    }

    public Fornecedor salvar(Fornecedor fornecedor) {
        return repository.save(fornecedor);
    }

    // Método para permitir a edição e desativação
    public Fornecedor atualizar(Long id, Fornecedor dadosNovos) {
        Fornecedor existente = buscarPorId(id);

        existente.setNome(dadosNovos.getNome());
        existente.setCnpjCpf(dadosNovos.getCnpjCpf());
        existente.setTelefone(dadosNovos.getTelefone());
        existente.setEmail(dadosNovos.getEmail());
        existente.setEndereco(dadosNovos.getEndereco());
        existente.setAtivo(dadosNovos.isAtivo()); // Permite ativar/desativar

        return repository.save(existente);
    }
}
