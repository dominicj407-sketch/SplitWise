package com.groupfinancetracker.config;

import com.groupfinancetracker.dto.DtoModels.*;
import com.groupfinancetracker.service.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

@Configuration
@Profile("h2")
public class DataInitializer {

        @Bean
        CommandLineRunner init(UserService userService,
                        GroupService groupService,
                        EventService eventService,
                        SubEventService subEventService,
                        ShareService shareService,
                        PaymentService paymentService) {
                return args -> {
                        UserResponse alice = userService
                                        .create(new CreateUserRequest("Alice", "alice@example.com", "password123"));
                        UserResponse bob = userService
                                        .create(new CreateUserRequest("Bob", "bob@example.com", "password123"));
                        UserResponse carol = userService
                                        .create(new CreateUserRequest("Carol", "carol@example.com", "password123"));

                        GroupResponse grp = groupService.create(new CreateGroupRequest("Goa Trip Group", alice.id(),
                                        Set.of(bob.id(), carol.id()), null));

                        EventResponse evt = eventService.create(new CreateEventRequest(grp.id(), "Goa Trip", alice.id(),
                                        LocalDate.now()));

                        SubEventResponse dinner = subEventService.create(new CreateSubEventRequest(
                                        evt.id(),
                                        "Dinner",
                                        new BigDecimal("1500.00"),
                                        alice.id(),
                                        LocalDate.now(),
                                        List.of(
                                                        new ShareSplit(bob.id(), new BigDecimal("500.00")),
                                                        new ShareSplit(carol.id(), new BigDecimal("1000.00"))),
                                        false,
                                        null));

                        subEventService.create(new CreateSubEventRequest(
                                        evt.id(),
                                        "Airport Taxi",
                                        new BigDecimal("900.00"),
                                        bob.id(),
                                        LocalDate.now(),
                                        List.of(
                                                        new ShareSplit(alice.id(), new BigDecimal("450.00")),
                                                        new ShareSplit(carol.id(), new BigDecimal("450.00"))),
                                        false,
                                        null));

                        var dinnerShares = shareService.listByUser(bob.id());
                        dinnerShares.stream()
                                        .filter(s -> s.subEventId().equals(dinner.id()))
                                        .findFirst()
                                        .ifPresent(s -> {
                                                paymentService.markPaid(new MarkPaymentRequest(s.id(), bob.id(), null, null));
                                                paymentService.confirm(new ConfirmPaymentRequest(s.id(), alice.id()));
                                        });
                };
        }
}
