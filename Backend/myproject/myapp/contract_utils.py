def get_user_display_name(user):
    try:
        full_name = user.get_full_name()
        if full_name:
            return full_name
    except Exception:
        pass

    for attr in ["full_name", "name", "username", "email"]:
        value = getattr(user, attr, "")
        if value:
            return str(value)

    return "User"


def get_listing_address(listing):
    for attr in ["address", "location", "city"]:
        value = getattr(listing, attr, "")
        if value:
            return str(value)
    return "N/A"


def get_listing_title(listing):
    return getattr(listing, "title", "Property")


def get_listing_price(listing):
    for attr in ["price", "rent_price", "monthly_rent"]:
        value = getattr(listing, attr, None)
        if value is not None:
            return value
    return 0


def build_contract_text(contract):
    owner_name = get_user_display_name(contract.owner)
    tenant_name = get_user_display_name(contract.tenant)
    listing_title = get_listing_title(contract.listing)
    listing_address = get_listing_address(contract.listing)

    start_date = contract.start_date.isoformat() if contract.start_date else "Not set"
    end_date = contract.end_date.isoformat() if contract.end_date else "Not set"

    return f"""
RENTAL AGREEMENT

Contract Title:
{contract.contract_title}

OWNER DETAILS
Name: {owner_name}

TENANT DETAILS
Name: {tenant_name}

PROPERTY DETAILS
Property: {listing_title}
Address: {listing_address}

RENTAL TERMS
Monthly Rent: {contract.rent_amount}
Security Deposit: {contract.security_deposit}
Payment Due Day: {contract.payment_due_day}
Start Date: {start_date}
End Date: {end_date}

UTILITY TERMS
{contract.utility_terms or "Utilities will be handled as agreed by both parties."}

HOUSE RULES
{contract.house_rules or "Tenant must maintain cleanliness, avoid damage, and follow owner/property rules."}

SPECIAL TERMS
{contract.special_terms or "No additional special terms."}

SIGNING STATUS
Owner Signed: {"Yes" if contract.owner_signed else "No"}
Tenant Signed: {"Yes" if contract.tenant_signed else "No"}

This agreement is digitally managed through the Smart Rental House Finder platform.
""".strip()