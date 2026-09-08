# Require explicit social account linking

An Apple or Google provider identity is never attached to an existing Benchmrk identity solely because their emails match. The member must first authenticate the Benchmrk identity and then complete a fresh provider sign-in; different provider emails are allowed because this prevents an unverified password identity from retaining access after an implicit merge, at the cost of a deliberate recovery step.
