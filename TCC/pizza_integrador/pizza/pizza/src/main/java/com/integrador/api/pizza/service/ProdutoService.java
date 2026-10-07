package com.integrador.api.pizza.service;

import com.integrador.api.pizza.dto.MovimentoEstoqueCadastroDTO;
import com.integrador.api.pizza.dto.ProdutoCadastroDTO;
import com.integrador.api.pizza.model.Produto;
import com.integrador.api.pizza.repository.ProdutoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class ProdutoService {

    @Autowired
    private ProdutoRepository repository;

    @Autowired
    private MovimentoEstoqueService movimentoEstoqueService;
    @Autowired
    private ProdutoRepository produtoRepository;

    @Transactional
    public Produto cadastrarProduto(ProdutoCadastroDTO dados) {
        Produto produto = new Produto();

        // Mapeamento dos campos existentes
        produto.setNome(dados.getNome());
        produto.setDescricao(dados.getDescricao());
        produto.setPreco(dados.getPreco());

        // 🚨 LÓGICA NOVA: Define a quantidade inicial
        // Note que o DTO tem o campo 'quantidade'.
        // Se você quiser garantir que seja zero se for nulo no DTO, trate aqui:
        Double quantidadeInicial = dados.getQuantidade() != null ? dados.getQuantidade() : 0.0;
        if (!Double.isFinite(quantidadeInicial) || quantidadeInicial<0) throw new IllegalArgumentException("Saldo inicial inválido.");
        produto.setQuantidade(0.0);
        produto = produtoRepository.save(produto);
        if (quantidadeInicial>0) {
            MovimentoEstoqueCadastroDTO entrada = new MovimentoEstoqueCadastroDTO(); entrada.setProdutoId(produto.getId()); entrada.setTipo("ENTRADA"); entrada.setQuantidade(quantidadeInicial);
            movimentoEstoqueService.cadastrarMovimento(entrada);
        }
        return produto;
    }

    public List<Produto> listarTodos() {
        return repository.findAll();
    }

    public Optional<Produto> buscarPorId(Long id) {
        return repository.findById(id);
    }

    @Transactional
    public Produto atualizarProduto(Long id, ProdutoCadastroDTO dados) {
        return repository.buscarParaAtualizar(id).map(produtoExistente -> {
            produtoExistente.setNome(dados.getNome());
            produtoExistente.setDescricao(dados.getDescricao());
            produtoExistente.setPreco(dados.getPreco());
            return repository.save(produtoExistente);
        }).orElseThrow(() -> new RuntimeException("Produto não encontrado com ID: " + id));
    }

    public void deletarProduto(Long id) {
        repository.deleteById(id);
    }
}
