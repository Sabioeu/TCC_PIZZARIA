package com.integrador.api.pizza.web;

import com.integrador.api.pizza.domain.CustomerFeedback;
import com.integrador.api.pizza.domain.StaffShift;
import com.integrador.api.pizza.security.AppPrincipal;
import com.integrador.api.pizza.service.PeopleExperienceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PeopleExperienceController {
    private final PeopleExperienceService service;

    @GetMapping("/workforce/shifts") public List<StaffShift> shifts(@RequestHeader(name="X-Branch-Id", defaultValue="1") Long branchId) { return service.shifts(branchId); }
    @GetMapping("/workforce/my") public StaffShift current(@RequestHeader(name="X-Branch-Id", defaultValue="1") Long branchId, @AuthenticationPrincipal AppPrincipal principal) { return service.currentShift(branchId, principal.id()); }
    @PostMapping("/workforce/clock-in") @ResponseStatus(HttpStatus.CREATED)
    public StaffShift clockIn(@RequestHeader(name="X-Branch-Id", defaultValue="1") Long branchId, @AuthenticationPrincipal AppPrincipal principal, @RequestBody(required=false) PeopleExperienceService.ShiftRequest request) { return service.clockIn(branchId, principal, request); }
    @PostMapping("/workforce/shifts/{id}/clock-out")
    public StaffShift clockOut(@RequestHeader(name="X-Branch-Id", defaultValue="1") Long branchId, @PathVariable Long id, @AuthenticationPrincipal AppPrincipal principal, @RequestBody(required=false) PeopleExperienceService.ShiftRequest request) { return service.clockOut(branchId, id, principal, request); }
    @PostMapping("/public/feedback") @ResponseStatus(HttpStatus.CREATED) public CustomerFeedback feedback(@RequestBody PeopleExperienceService.FeedbackRequest request) { return service.submitFeedback(request); }
    @GetMapping("/experience/feedback") public Map<String,Object> feedback(@RequestHeader(name="X-Branch-Id", defaultValue="1") Long branchId) { return service.feedbackSummary(branchId); }
}
