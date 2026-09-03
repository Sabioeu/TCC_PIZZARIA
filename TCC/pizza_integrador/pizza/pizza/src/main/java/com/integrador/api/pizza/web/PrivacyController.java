package com.integrador.api.pizza.web;

import com.integrador.api.pizza.service.PrivacyService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController @RequestMapping("/api/privacy") @RequiredArgsConstructor
public class PrivacyController {
    private final PrivacyService privacy;
    @GetMapping("/customers/{id}/export") public Map<String,Object> export(@RequestHeader(name="X-Branch-Id", defaultValue="1") Long branchId, @PathVariable Long id) { return privacy.export(branchId, id); }
    @PostMapping("/customers/{id}/anonymize") public Map<String,String> anonymize(@RequestHeader(name="X-Branch-Id", defaultValue="1") Long branchId, @PathVariable Long id) { return privacy.anonymize(branchId, id); }
}
