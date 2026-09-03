package com.integrador.api.pizza.service;

import com.integrador.api.pizza.domain.*;
import com.integrador.api.pizza.repository.*;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service @RequiredArgsConstructor
public class CommerceService {
    private final PaymentChargeRepository charges;
    private final CustomerMessageRepository messages;
    private final FiscalDocumentRepository fiscalDocuments;
    private final SaleOrderRepository orders;
    private final CustomerRepository customers;
    private final AuditService audit;

    public List<PaymentCharge> charges(Long branchId) { return charges.findTop100ByBranchIdOrderByCreatedAtDesc(branchId); }
    public List<CustomerMessage> messages(Long branchId) { return messages.findTop100ByBranchIdOrderByCreatedAtDesc(branchId); }
    public List<FiscalDocument> fiscalDocuments(Long branchId) { return fiscalDocuments.findTop100ByBranchIdOrderByCreatedAtDesc(branchId); }

    @Transactional
    public PaymentCharge createPixCharge(Long branchId, PixRequest request) {
        SaleOrder order = orderForBranch(branchId, request.orderId());
        BigDecimal amount = request.amount() == null ? order.getTotal() : request.amount();
        if (amount.signum() <= 0 || amount.compareTo(order.getTotal()) > 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Valor de cobrança inválido");
        String reference = "AUR-PIX-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        PaymentCharge charge = PaymentCharge.builder().branchId(branchId).orderId(order.getId()).provider("MANUAL_OR_PROVIDER")
                .method("PIX").status(PaymentCharge.Status.PENDING).amount(amount).externalReference(reference)
                .pixCopyPaste("00020126360014BR.GOV.BCB.PIX0114" + reference + "520400005303986540" + amount.toPlainString().replace(".", "") + "5802BR5913AURORA PIZZA6009SAO PAULO62070503***6304")
                .expiresAt(LocalDateTime.now().plusMinutes(30)).build();
        audit.record(branchId, "CREATE_PIX_CHARGE", "PAYMENT_CHARGE", reference, "Cobrança PIX para " + order.getCode());
        return charges.save(charge);
    }

    @Transactional
    public PaymentCharge confirmCharge(Long branchId, Long id) {
        PaymentCharge charge = charges.findById(id).filter(value -> value.getBranchId().equals(branchId))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Cobrança não encontrada"));
        if (charge.getStatus() != PaymentCharge.Status.PENDING) throw new ResponseStatusException(HttpStatus.CONFLICT, "Cobrança não pode mais ser confirmada");
        charge.setStatus(PaymentCharge.Status.PAID); charge.setPaidAt(LocalDateTime.now());
        audit.record(branchId, "CONFIRM_PAYMENT", "PAYMENT_CHARGE", id, "Pagamento confirmado: " + charge.getExternalReference());
        return charges.save(charge);
    }

    @Transactional
    public CustomerMessage queueMessage(Long branchId, MessageRequest request) {
        String recipient = request.recipient();
        if (request.customerId() != null) recipient = customers.findById(request.customerId()).filter(c -> c.getBranchId().equals(branchId))
                .map(Customer::getPhone).orElse(recipient);
        if (recipient == null || recipient.isBlank()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe um telefone ou e-mail do destinatário");
        CustomerMessage message = CustomerMessage.builder().branchId(branchId).customerId(request.customerId()).orderId(request.orderId())
                .channel(request.channel() == null ? CustomerMessage.Channel.WHATSAPP : request.channel()).status(CustomerMessage.Status.QUEUED)
                .recipient(recipient).templateCode(request.templateCode()).body(request.body()).scheduledAt(request.scheduledAt()).build();
        audit.record(branchId, "QUEUE_MESSAGE", "CUSTOMER_MESSAGE", null, "Mensagem para " + recipient);
        return messages.save(message);
    }

    @Transactional
    public FiscalDocument requestFiscalDocument(Long branchId, FiscalRequest request) {
        SaleOrder order = orderForBranch(branchId, request.orderId());
        FiscalDocument fiscal = FiscalDocument.builder().branchId(branchId).orderId(order.getId()).documentType(request.documentType() == null ? "NFC_E" : request.documentType())
                .provider(request.provider() == null ? "A CONFIGURAR" : request.provider()).status(FiscalDocument.Status.PENDING_CONFIGURATION)
                .message("Documento preparado. Configure certificado digital e credenciais do provedor fiscal para autorizar a emissão.").build();
        audit.record(branchId, "REQUEST_FISCAL_DOCUMENT", "FISCAL_DOCUMENT", order.getId(), fiscal.getDocumentType());
        return fiscalDocuments.save(fiscal);
    }

    public Map<String, Object> backupSnapshot(Long branchId) {
        Map<String, Object> snapshot = new LinkedHashMap<>();
        snapshot.put("generatedAt", LocalDateTime.now()); snapshot.put("branchId", branchId); snapshot.put("format", "AURORA-EXPORT-1");
        snapshot.put("orders", orders.findAllByBranchIdOrderByCreatedAtDesc(branchId)); snapshot.put("customers", customers.findAllByBranchIdOrderByNameAsc(branchId));
        snapshot.put("charges", charges(branchId)); snapshot.put("messages", messages(branchId)); snapshot.put("fiscalDocuments", fiscalDocuments(branchId));
        audit.record(branchId, "EXPORT_BACKUP", "BACKUP", null, "Snapshot operacional exportado");
        return snapshot;
    }

    private SaleOrder orderForBranch(Long branchId, Long orderId) { return orders.findById(orderId).filter(value -> value.getBranchId().equals(branchId)).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pedido não encontrado")); }
    public record PixRequest(Long orderId, BigDecimal amount) { }
    public record MessageRequest(Long customerId, Long orderId, CustomerMessage.Channel channel, String recipient, String templateCode, String body, LocalDateTime scheduledAt) { }
    public record FiscalRequest(Long orderId, String documentType, String provider) { }
}
