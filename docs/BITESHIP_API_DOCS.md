# Biteship API Documentation

Sumber: https://biteship.com/en/docs/intro

## Retrieve Courier Rates API

### Endpoint
```
POST /v1/rates/couriers
```

### Base URL
```
https://api.biteship.com
```

### Authentication
```
Authorization: Bearer {API_KEY}
Content-Type: application/json
```

### Required Parameters

1. **couriers** (string)
   - List of courier names separated by commas
   - Example: "jne,jnt,grab,gojek"
   - See Courier API for complete list

2. **items** (array)
   - Array of items being shipped
   - Each item requires: name, description, value, length, width, height, weight, quantity

### Location Parameters (Choose ONE of the following combinations)

#### Option 1: Using Area IDs (Recommended)
- **origin_area_id** (string) - Get from Maps API
- **destination_area_id** (string) - Get from Maps API

#### Option 2: Using Coordinates
- **origin_latitude** (number)
- **origin_longitude** (number)
- **destination_latitude** (number)
- **destination_longitude** (number)

#### Option 3: Using Postal Codes (Simple)
- **origin_postal_code** (number)
- **destination_postal_code** (number)

### Optional Parameters

- **type** (string)
  - Default: automatic selection
  - Value: "origin_suggestion_to_closest_destination"
  - Biteship automatically selects nearest location

- **courier_insurance** (number)
  - Insurance value in IDR (e.g., 1000000 for IDR 1,000,000)

- **destination_cash_on_delivery** (number)
  - COD amount in IDR (max IDR 15,000,000)

- **destination_cash_on_delivery_type** (string)
  - "7_days" - Receive money 7 days after delivery
  - "5_days" - Receive money 5 days after delivery
  - "3_days" - Receive money 3 days after delivery

### Example Request (Using Postal Codes)

```json
{
  "origin_postal_code": 51212,
  "destination_postal_code": 16518,
  "couriers": "jne,jnt,grab,gojek",
  "items": [
    {
      "name": "Laptop",
      "description": "Dell XPS 13",
      "value": 1000000,
      "length": 30,
      "width": 20,
      "height": 5,
      "weight": 1000,
      "quantity": 1
    }
  ]
}
```

### Example Response

```json
{
  "success": true,
  "data": {
    "pricing": [
      {
        "courier_name": "JNE",
        "courier_code": "jne",
        "courier_service_name": "JNE REG",
        "type": "regular",
        "price": 25000,
        "duration": "3-5 days",
        "per_items": [
          {
            "name": "Laptop",
            "price": 25000
          }
        ]
      },
      {
        "courier_name": "JNT",
        "courier_code": "jnt",
        "courier_service_name": "JNT Express",
        "type": "regular",
        "price": 18000,
        "duration": "2-3 days",
        "per_items": [
          {
            "name": "Laptop",
            "price": 18000
          }
        ]
      }
    ]
  }
}
```

## Response Fields

- **courier_name** (string) - Display name (e.g., "JNE", "JNT")
- **courier_code** (string) - API identifier (e.g., "jne", "jnt")
- **courier_service_name** (string) - Full service name (e.g., "JNE REG")
- **type** (string) - Service type (regular, instant, cargo)
- **price** (number) - Price in IDR
- **duration** (string) - Estimated delivery time

## Notes

- Weight parameter **must include items array** with weight details
- Postal code method is simplest but may have coordinate ambiguity
- For instant couriers (Gojek, Grab), coordinates are recommended
- Max COD amount is IDR 15,000,000
