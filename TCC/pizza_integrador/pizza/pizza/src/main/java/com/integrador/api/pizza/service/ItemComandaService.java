package com.integrador.api.pizza.service;

import com.integrador.api.pizza.dto.ItemComandaCadastroDTO;
import com.integrador.api.pizza.model.Comanda;
import com.integrador.api.pizza.model.ItemComanda;
import com.integrador.api.pizza.model.Produto;
import com.integrador.api.pizza.repository.ComandaRepository;
import com.integrador.api.pizza.repository.ItemComandaRepository;
import com.integrador.api.pizza.repository.ProdutoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class ItemComandaService {

    @Autowired
    private ItemComandaRepository itemComandaRepository;

    @Autowired
    private ComandaRepository comandaRepository;

    @Autowired
    private ProdutoRepository produtoRepository;

    // =========================================================================================
    // Métodos Auxiliares
    // =========================================================================================
    /**
     * Recalcula o total de uma comanda buscando todos os itens associados no banco.
     * @param comandaId ID da comanda a ser recalculada.
     */
    private void recalcularTotalComanda(Long comandaId) {
        Comanda comanda = comandaRepository.buscarParaAtualizar(comandaId)
                .orElseThrow(() -> new RuntimeException("Comanda não encontrada com ID: " + comandaId));

        // Busca a lista atualizada de itens do repositório
        List<ItemComanda> itens = itemComandaRepository.findByComandaId(comandaId);

        double novoTotal = itens.stream()
                .mapToDouble(ItemComanda::getSubtotal)
                .sum();

        comanda.setTotal(novoTotal);
        comandaRepository.save(comanda);
    }

    // =========================================================================================
    // 1. CADASTRAR ITEM (Adicionar item a uma comanda existente)
    // =========================================================================================
    @Transactional
    public ItemComanda cadastrarItemComanda(Long comandaId, ItemComandaCadastroDTO dados) {
        Comanda comanda = comandaRepository.buscarParaAtualizar(comandaId)
                .orElseThrow(() -> new RuntimeException("Comanda não encontrada com ID: " + comandaId));
        if (!"ABERTA".equals(comanda.getStatus())) throw new IllegalArgumentException("Comanda fechada não aceita alterações.");

        Produto produto = produtoRepository.findById(dados.getProdutoId())
                .orElseThrow(() -> new RuntimeException("Produto não encontrado com ID: " + dados.getProdutoId()));

        if (dados.getQuantidade() <= 0) {
            throw new IllegalArgumentException("A quantidade do item deve ser maior que zero.");
        }

        // Usa o preço ATUAL do Produto
        Double precoUnitario = produto.getPreco();
        Double subtotal = precoUnitario * dados.getQuantidade();

        ItemComanda itemComanda = new ItemComanda();
        itemComanda.setComanda(comanda);
        itemComanda.setProduto(produto);
        itemComanda.setQuantidade(dados.getQuantidade());
        itemComanda.setPrecoUnitario(precoUnitario);
        itemComanda.setSubtotal(subtotal);

        ItemComanda itemSalvo = itemComandaRepository.save(itemComanda);

        // Recalcular o total da comanda após salvar o item
        recalcularTotalComanda(comandaId);

        return itemSalvo;
    }

    // =========================================================================================
    // 2. LISTAR ITENS POR COMANDA
    // =========================================================================================
    // OBS: Renomeei este método para ser mais claro e garantir que você não use o listarTodos().
    public List<ItemComanda> listarItensDaComanda(Long comandaId) {
        // A busca no ItemComandaRepository geralmente é mais eficiente que comanda.getItens()
        return itemComandaRepository.findByComandaId(comandaId);
    }

    // Métodos de listagem e busca por ID (mantidos do original)
    public List<ItemComanda> listarTodos() {
        return itemComandaRepository.findAll();
    }

    public Optional<ItemComanda> buscarPorId(Long id) {
        return itemComandaRepository.findById(id);
    }

    // =========================================================================================
    // 3. ATUALIZAR ITEM
    // =========================================================================================
    @Transactional
    public ItemComanda atualizarItemComanda(Long comandaId, Long id, ItemComandaCadastroDTO dados) {
        Comanda comanda = comandaRepository.buscarParaAtualizar(comandaId).orElseThrow(() -> new IllegalArgumentException("Comanda não encontrada."));
        if (!"ABERTA".equals(comanda.getStatus())) throw new IllegalArgumentException("Comanda fechada não aceita alterações.");
        ItemComanda itemExistente = itemComandaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Item de Comanda não encontrado com ID: " + id));
        if (!itemExistente.getComanda().getId().equals(comandaId)) throw new IllegalArgumentException("Item não pertence a esta comanda.");
        if (!itemExistente.getProduto().getId().equals(dados.getProdutoId())) throw new IllegalArgumentException("Não é permitido trocar o produto do item. Remova e adicione o item correto.");

        if (dados.getQuantidade() <= 0) {
            throw new IllegalArgumentException("A quantidade do item deve ser maior que zero.");
        }

        // 1. Atualizar campos
        itemExistente.setQuantidade(dados.getQuantidade());

        // NOTA: Geralmente o preço unitário NÃO muda em um pedido existente.
        // Se você quiser permitir a mudança de preço: itemExistente.setPrecoUnitario(dados.getPrecoUnitario());

        // 2. Recalcular Subtotal
        Double novoSubtotal = itemExistente.getQuantidade() * itemExistente.getPrecoUnitario();
        itemExistente.setSubtotal(novoSubtotal);

        // 3. Salvar o item
        ItemComanda itemAtualizado = itemComandaRepository.save(itemExistente);

        // 4. Recalcular o total da comanda (CRUCIAL!)
        recalcularTotalComanda(itemAtualizado.getComanda().getId());

        return itemAtualizado;
    }

    // =========================================================================================
    // 4. DELETAR ITEM
    // =========================================================================================
    @Transactional
    public void deletarItemComanda(Long comandaId, Long id) {
        Comanda comanda = comandaRepository.buscarParaAtualizar(comandaId).orElseThrow(() -> new IllegalArgumentException("Comanda não encontrada."));
        if (!"ABERTA".equals(comanda.getStatus())) throw new IllegalArgumentException("Comanda fechada não aceita alterações.");
        ItemComanda itemToDelete = itemComandaRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Item de Comanda não encontrado com ID: " + id));

        if (!itemToDelete.getComanda().getId().equals(comandaId)) throw new IllegalArgumentException("Item não pertence a esta comanda.");

        // 1. Deletar o item
        itemComandaRepository.deleteById(id);

        // 2. Recalcular o total da comanda (CRUCIAL!)
        // O método recalcularTotalComanda fará a busca no BD e o cálculo correto.
        recalcularTotalComanda(comandaId);
    }
}
