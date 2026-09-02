package com.integrador.api.pizza.web;

import com.integrador.api.pizza.domain.*;
import com.integrador.api.pizza.service.AuditService;
import com.integrador.api.pizza.service.ManagementService;
import com.integrador.api.pizza.service.OperationsService;
import com.integrador.api.pizza.security.AppPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ManagementController {
    private final ManagementService management;
    private final OperationsService operations;
    private final AuditService audit;

    @GetMapping("/branches") public List<Branch> branches() { return management.branches(); }
    @PostMapping("/branches") @ResponseStatus(HttpStatus.CREATED) public Branch branch(@RequestBody Branch branch) { return management.saveBranch(branch); }

    @GetMapping("/settings") public BusinessSettings settings(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId) { return management.settings(branchId); }
    @PutMapping("/settings") public BusinessSettings settings(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId, @RequestBody BusinessSettings value) { return management.saveSettings(branchId, value); }

    @GetMapping("/suppliers") public List<Supplier> suppliers(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId) { return management.suppliers(branchId); }
    @PostMapping("/suppliers") @ResponseStatus(HttpStatus.CREATED) public Supplier supplier(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId, @RequestBody Supplier value) { return management.saveSupplier(branchId, value); }
    @GetMapping("/purchases") public List<PurchaseOrder> purchases(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId) { return management.purchases(branchId); }
    @PostMapping("/purchases") @ResponseStatus(HttpStatus.CREATED) public PurchaseOrder purchase(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId, @RequestBody ManagementService.PurchaseRequest value) { return management.createPurchase(branchId, value); }
    @PostMapping("/purchases/{id}/receive") public PurchaseOrder receive(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId, @PathVariable Long id) { return management.receivePurchase(branchId, id); }

    @GetMapping("/reservations") public List<Reservation> reservations(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId) { return management.reservations(branchId); }
    @PostMapping("/reservations") @ResponseStatus(HttpStatus.CREATED) public Reservation reservation(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId, @RequestBody ManagementService.ReservationRequest value) { return management.createReservation(branchId, value); }
    @PatchMapping("/reservations/{id}/status") public Reservation reservationStatus(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId, @PathVariable Long id, @RequestBody ReservationStatusRequest value) { return management.updateReservation(branchId, id, value.status()); }

    @GetMapping("/cash/current") public Map<String, Object> cash(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId) { return management.currentCash(branchId); }
    @PostMapping("/cash/open") public Map<String, Object> openCash(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId, @RequestBody ManagementService.CashOpenRequest value) { return management.openCash(branchId, value); }
    @PostMapping("/cash/movements") public Map<String, Object> cashMovement(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId, @RequestBody ManagementService.CashMovementRequest value) { return management.cashMovement(branchId, value); }
    @PostMapping("/cash/close") public Map<String, Object> closeCash(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId, @RequestBody ManagementService.CashCloseRequest value) { return management.closeCash(branchId, value); }

    @GetMapping("/loyalty") public List<LoyaltyTransaction> loyalty(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId) { return management.loyalty(branchId); }
    @PostMapping("/customers/{id}/loyalty") public Customer loyalty(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId, @PathVariable Long id, @RequestBody ManagementService.LoyaltyRequest value) { return management.adjustLoyalty(branchId, id, value); }
    @GetMapping("/reports/intelligence") public Map<String, Object> intelligence(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId) { return management.intelligence(branchId); }
    @GetMapping("/audit") public List<AuditEvent> audit(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId) { return audit.list(branchId); }

    @GetMapping("/bootstrap")
    public Map<String, Object> bootstrap(@RequestHeader(name = "X-Branch-Id", defaultValue = "1") Long branchId,
                                         @AuthenticationPrincipal AppPrincipal principal) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("branches", management.branches()); result.put("products", operations.products(branchId));
        result.put("orders", operations.orders(branchId)); result.put("tables", operations.tables(branchId));
        result.put("dashboard", operations.dashboard(branchId)); result.put("reservations", management.reservations(branchId));
        result.put("coupons", operations.coupons(branchId));
        boolean inventoryAccess = principal.role() == AppUser.Role.ADMIN || principal.role() == AppUser.Role.MANAGER || principal.role() == AppUser.Role.KITCHEN;
        boolean customerAccess = principal.role() != AppUser.Role.KITCHEN;
        boolean cashAccess = principal.role() == AppUser.Role.ADMIN || principal.role() == AppUser.Role.MANAGER || principal.role() == AppUser.Role.CASHIER;
        boolean managementAccess = principal.role() == AppUser.Role.ADMIN || principal.role() == AppUser.Role.MANAGER;
        if (inventoryAccess) { result.put("inventory", operations.inventory(branchId)); result.put("stockMovements", operations.stockMovements(branchId)); }
        if (customerAccess) result.put("customers", operations.customers(branchId));
        if (cashAccess) result.put("cash", management.currentCash(branchId));
        if (managementAccess) {
            result.put("finance", operations.finance(branchId)); result.put("suppliers", management.suppliers(branchId));
            result.put("purchases", management.purchases(branchId)); result.put("intelligence", management.intelligence(branchId));
            result.put("settings", management.settings(branchId));
        }
        return result;
    }

    @GetMapping("/public/menu/{token}") public Map<String, Object> publicMenu(@PathVariable String token) { return management.publicMenu(token); }
    @PostMapping("/public/menu/{token}/orders") @ResponseStatus(HttpStatus.CREATED)
    public SaleOrder publicOrder(@PathVariable String token, @RequestBody OperationsService.CreateOrder request) { return management.createPublicTableOrder(token, request); }
    public record ReservationStatusRequest(Reservation.Status status) { }
}
