package com.integrador.api.pizza.web;

import com.integrador.api.pizza.domain.*;
import com.integrador.api.pizza.service.CommerceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController @RequestMapping("/api/commerce") @RequiredArgsConstructor
public class CommerceController {
    private final CommerceService commerce;
    @GetMapping("/charges") public List<PaymentCharge> charges(@RequestHeader(name="X-Branch-Id", defaultValue="1") Long branchId) { return commerce.charges(branchId); }
    @PostMapping("/pix") @ResponseStatus(HttpStatus.CREATED) public PaymentCharge pix(@RequestHeader(name="X-Branch-Id", defaultValue="1") Long branchId, @RequestBody CommerceService.PixRequest request) { return commerce.createPixCharge(branchId, request); }
    @PostMapping("/charges/{id}/confirm") public PaymentCharge confirm(@RequestHeader(name="X-Branch-Id", defaultValue="1") Long branchId, @PathVariable Long id) { return commerce.confirmCharge(branchId, id); }
    @GetMapping("/messages") public List<CustomerMessage> messages(@RequestHeader(name="X-Branch-Id", defaultValue="1") Long branchId) { return commerce.messages(branchId); }
    @PostMapping("/messages") @ResponseStatus(HttpStatus.CREATED) public CustomerMessage message(@RequestHeader(name="X-Branch-Id", defaultValue="1") Long branchId, @RequestBody CommerceService.MessageRequest request) { return commerce.queueMessage(branchId, request); }
    @GetMapping("/fiscal") public List<FiscalDocument> fiscal(@RequestHeader(name="X-Branch-Id", defaultValue="1") Long branchId) { return commerce.fiscalDocuments(branchId); }
    @PostMapping("/fiscal") @ResponseStatus(HttpStatus.CREATED) public FiscalDocument fiscal(@RequestHeader(name="X-Branch-Id", defaultValue="1") Long branchId, @RequestBody CommerceService.FiscalRequest request) { return commerce.requestFiscalDocument(branchId, request); }
    @GetMapping(value="/backup", produces=MediaType.APPLICATION_JSON_VALUE) public Map<String,Object> backup(@RequestHeader(name="X-Branch-Id", defaultValue="1") Long branchId) { return commerce.backupSnapshot(branchId); }
}
