# CLAUDE CODE PROMPT: CSI Collapsible Division → Section Picker

Read CLAUDE.md, ARCHITECTURE.md, and SCHEMA.md before making any changes. Commit current state before starting.

## CONTEXT
Beta user feedback: current broad CSI division checkboxes cause false positives in trade match scoring. A flooring sub got a GO score on a ceramic-only job — outside their scope. We need a two-level collapsible CSI picker using the full MasterFormat hierarchy: user clicks a Division header to expand it, then checks only the specific sections they actually bid. This same selection pre-populates the outcome tracking modal so we capture exactly what scope was submitted on each project.

---

## CHANGE 1: SCHEMA MIGRATION
Run in Supabase SQL editor:

```sql
ALTER TABLE user_settings 
  ADD COLUMN IF NOT EXISTS preferred_csi_sections TEXT[] DEFAULT '{}';

ALTER TABLE bids 
  ADD COLUMN IF NOT EXISTS bid_divisions_submitted TEXT[] DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_bids_divisions 
  ON bids USING GIN (bid_divisions_submitted);
```

---

## CHANGE 2: FULL CSI DATA STRUCTURE
Add this constant near the top of app.html. This is the complete MasterFormat hierarchy sourced directly from the BidIntell CSI division list. Divisions are the expandable parents; sections are the checkable children.

```javascript
const CSI_DIVISIONS = [
  { div: "03", label: "Concrete", sections: [
    { code: "03 01 00", label: "Maintenance of Concrete" },
    { code: "03 05 00", label: "Common Work Results for Concrete" },
    { code: "03 10 00", label: "Concrete Forming and Accessories" },
    { code: "03 11 00", label: "Concrete Forming" },
    { code: "03 15 00", label: "Concrete Accessories" },
    { code: "03 20 00", label: "Concrete Reinforcing" },
    { code: "03 21 00", label: "Reinforcement Bars" },
    { code: "03 22 00", label: "Fabric and Grid Reinforcing" },
    { code: "03 23 00", label: "Stressed Tendon Reinforcing" },
    { code: "03 24 00", label: "Fibrous Reinforcing" },
    { code: "03 25 00", label: "Composite Reinforcing" },
    { code: "03 30 00", label: "Cast-in-Place Concrete" },
    { code: "03 31 00", label: "Structural Concrete" },
    { code: "03 33 00", label: "Architectural Concrete" },
    { code: "03 34 00", label: "Low Density Concrete" },
    { code: "03 35 00", label: "Concrete Finishing" },
    { code: "03 37 00", label: "Specialty Placed Concrete" },
    { code: "03 38 00", label: "Post-Tensioned Concrete" },
    { code: "03 39 00", label: "Concrete Curing" },
    { code: "03 40 00", label: "Precast Concrete" },
    { code: "03 41 00", label: "Precast Structural Concrete" },
    { code: "03 45 00", label: "Precast Architectural Concrete" },
    { code: "03 47 00", label: "Site-Cast Concrete" },
    { code: "03 48 00", label: "Precast Concrete Specialties" },
    { code: "03 49 00", label: "Glass-Fiber-Reinforced Concrete" },
    { code: "03 50 00", label: "Cast Decks and Underlayment" },
    { code: "03 51 00", label: "Cast Roof Decks" },
    { code: "03 52 00", label: "Lightweight Concrete Roof Insulation" },
    { code: "03 53 00", label: "Concrete Topping" },
    { code: "03 54 00", label: "Cast Underlayment" },
    { code: "03 60 00", label: "Grouting" },
    { code: "03 61 00", label: "Cementitious Grouting" },
    { code: "03 62 00", label: "Non-Shrink Grouting" },
    { code: "03 63 00", label: "Epoxy Grouting" },
    { code: "03 64 00", label: "Injection Grouting" },
    { code: "03 70 00", label: "Mass Concrete" },
    { code: "03 80 00", label: "Concrete Cutting and Boring" },
    { code: "03 81 00", label: "Concrete Cutting" },
    { code: "03 82 00", label: "Concrete Boring" }
  ]},
  { div: "04", label: "Masonry", sections: [
    { code: "04 01 00", label: "Maintenance of Masonry" },
    { code: "04 20 00", label: "Unit Masonry" },
    { code: "04 21 00", label: "Clay Unit Masonry" },
    { code: "04 22 00", label: "Concrete Unit Masonry (CMU)" },
    { code: "04 23 00", label: "Glass Unit Masonry" },
    { code: "04 24 00", label: "Adobe Unit Masonry" },
    { code: "04 25 00", label: "Unit Masonry Panels" },
    { code: "04 26 00", label: "Single-Wythe Unit Masonry" },
    { code: "04 27 00", label: "Multiple-Wythe Unit Masonry" },
    { code: "04 28 00", label: "Concrete Form Masonry Units" },
    { code: "04 29 00", label: "Engineered Unit Masonry" },
    { code: "04 40 00", label: "Stone Assemblies" },
    { code: "04 41 00", label: "Dry-Placed Stone" },
    { code: "04 42 00", label: "Exterior Stone Cladding" },
    { code: "04 43 00", label: "Stone Masonry" },
    { code: "04 50 00", label: "Refractory Masonry" },
    { code: "04 51 00", label: "Flue Liner Masonry" },
    { code: "04 52 00", label: "Combustion Chamber Masonry" },
    { code: "04 53 00", label: "Castable Refractory Masonry" },
    { code: "04 54 00", label: "Refractory Brick Masonry" },
    { code: "04 57 00", label: "Masonry Fireplaces" },
    { code: "04 60 00", label: "Corrosion-Resistant Masonry" },
    { code: "04 70 00", label: "Manufactured Masonry" },
    { code: "04 71 00", label: "Manufactured Brick Masonry" },
    { code: "04 72 00", label: "Cast Stone Masonry" },
    { code: "04 73 00", label: "Manufactured Stone Masonry" }
  ]},
  { div: "05", label: "Metals", sections: [
    { code: "05 10 00", label: "Structural Metal Framing" },
    { code: "05 12 00", label: "Structural Steel Framing" },
    { code: "05 13 00", label: "Structural Stainless-Steel Framing" },
    { code: "05 14 00", label: "Structural Aluminum Framing" },
    { code: "05 15 00", label: "Wire Rope Assemblies" },
    { code: "05 16 00", label: "Structural Cabling" },
    { code: "05 20 00", label: "Metal Joists" },
    { code: "05 21 00", label: "Steel Joist Framing" },
    { code: "05 25 00", label: "Aluminum Joist Framing" },
    { code: "05 30 00", label: "Metal Decking" },
    { code: "05 31 00", label: "Steel Decking" },
    { code: "05 33 00", label: "Aluminum Decking" },
    { code: "05 34 00", label: "Acoustical Metal Decking" },
    { code: "05 36 00", label: "Composite Metal Decking" },
    { code: "05 40 00", label: "Cold-Formed Metal Framing" },
    { code: "05 41 00", label: "Structural Metal Stud Framing" },
    { code: "05 42 00", label: "Cold-Formed Metal Joist Framing" },
    { code: "05 43 00", label: "Slotted Channel Framing" },
    { code: "05 44 00", label: "Cold-Formed Metal Trusses" },
    { code: "05 45 00", label: "Metal Support Assemblies" },
    { code: "05 50 00", label: "Metal Fabrications" },
    { code: "05 51 00", label: "Metal Stairs" },
    { code: "05 52 00", label: "Metal Railings" },
    { code: "05 53 00", label: "Metal Gratings" },
    { code: "05 54 00", label: "Metal Floor Plates" },
    { code: "05 55 00", label: "Metal Stair Treads and Nosings" },
    { code: "05 56 00", label: "Metal Castings" },
    { code: "05 58 00", label: "Formed Metal Fabrications" },
    { code: "05 59 00", label: "Metal Specialties" },
    { code: "05 70 00", label: "Decorative Metal" },
    { code: "05 71 00", label: "Decorative Metal Stairs" },
    { code: "05 73 00", label: "Decorative Metal Railings" },
    { code: "05 74 00", label: "Decorative Metal Castings" },
    { code: "05 75 00", label: "Decorative Formed Metal" },
    { code: "05 76 00", label: "Decorative Forged Metal" }
  ]},
  { div: "06", label: "Wood, Plastics and Composites", sections: [
    { code: "06 10 00", label: "Rough Carpentry" },
    { code: "06 11 00", label: "Wood Framing" },
    { code: "06 12 00", label: "Structural Panels" },
    { code: "06 13 00", label: "Heavy Timber Construction" },
    { code: "06 14 00", label: "Treated Wood Foundations" },
    { code: "06 15 00", label: "Wood Decking" },
    { code: "06 16 00", label: "Sheathing" },
    { code: "06 17 00", label: "Shop-Fabricated Structural Wood" },
    { code: "06 18 00", label: "Glued-Laminated Construction" },
    { code: "06 20 00", label: "Finish Carpentry" },
    { code: "06 22 00", label: "Millwork" },
    { code: "06 25 00", label: "Prefinished Paneling" },
    { code: "06 26 00", label: "Board Paneling" },
    { code: "06 40 00", label: "Architectural Woodwork" },
    { code: "06 41 00", label: "Architectural Wood Casework" },
    { code: "06 42 00", label: "Wood Paneling" },
    { code: "06 43 00", label: "Wood Stairs and Railings" },
    { code: "06 44 00", label: "Ornamental Woodwork" },
    { code: "06 46 00", label: "Wood Trim" },
    { code: "06 48 00", label: "Wood Frames" },
    { code: "06 50 00", label: "Structural Plastics" },
    { code: "06 60 00", label: "Plastic Fabrications" },
    { code: "06 61 00", label: "Simulated Stone Fabrications" },
    { code: "06 63 00", label: "Plastic Railings" },
    { code: "06 64 00", label: "Plastic Paneling" },
    { code: "06 65 00", label: "Plastic Simulated Wood Trim" },
    { code: "06 70 00", label: "Structural Composites" },
    { code: "06 80 00", label: "Composite Fabrications" },
    { code: "06 81 00", label: "Composite Railings" },
    { code: "06 83 00", label: "Composite Paneling" }
  ]},
  { div: "07", label: "Thermal and Moisture Protection", sections: [
    { code: "07 10 00", label: "Dampproofing and Waterproofing" },
    { code: "07 11 00", label: "Dampproofing" },
    { code: "07 12 00", label: "Built-Up Bituminous Waterproofing" },
    { code: "07 13 00", label: "Sheet Waterproofing" },
    { code: "07 14 00", label: "Fluid-Applied Waterproofing" },
    { code: "07 15 00", label: "Sheet Metal Waterproofing" },
    { code: "07 16 00", label: "Cementitious and Reactive Waterproofing" },
    { code: "07 17 00", label: "Bentonite Waterproofing" },
    { code: "07 18 00", label: "Traffic Coatings" },
    { code: "07 19 00", label: "Water Repellents" },
    { code: "07 20 00", label: "Thermal Protection" },
    { code: "07 21 00", label: "Thermal Insulation" },
    { code: "07 22 00", label: "Roof and Deck Insulation" },
    { code: "07 24 00", label: "Exterior Insulation and Finish Systems (EIFS)" },
    { code: "07 25 00", label: "Weather Barriers" },
    { code: "07 26 00", label: "Vapor Retarders" },
    { code: "07 27 00", label: "Air Barriers" },
    { code: "07 30 00", label: "Steep Slope Roofing" },
    { code: "07 31 00", label: "Shingles and Shakes" },
    { code: "07 32 00", label: "Roof Tiles" },
    { code: "07 33 00", label: "Natural Roof Coverings" },
    { code: "07 40 00", label: "Roofing and Siding Panels" },
    { code: "07 41 00", label: "Roof Panels" },
    { code: "07 42 00", label: "Wall Panels" },
    { code: "07 44 00", label: "Faced Panels" },
    { code: "07 46 00", label: "Siding" },
    { code: "07 50 00", label: "Membrane Roofing" },
    { code: "07 51 00", label: "Built-Up Bituminous Roofing" },
    { code: "07 52 00", label: "Modified Bituminous Membrane Roofing" },
    { code: "07 53 00", label: "Elastomeric Membrane Roofing (EPDM)" },
    { code: "07 54 00", label: "Thermoplastic Membrane Roofing (TPO/PVC)" },
    { code: "07 55 00", label: "Protected Membrane Roofing" },
    { code: "07 56 00", label: "Fluid-Applied Roofing" },
    { code: "07 57 00", label: "Coated Foamed Roofing" },
    { code: "07 58 00", label: "Roll Roofing" },
    { code: "07 60 00", label: "Flashing and Sheet Metal" },
    { code: "07 61 00", label: "Sheet Metal Roofing" },
    { code: "07 62 00", label: "Sheet Metal Flashing and Trim" },
    { code: "07 63 00", label: "Sheet Metal Roofing Specialties" },
    { code: "07 64 00", label: "Sheet Metal Wall Cladding" },
    { code: "07 65 00", label: "Flexible Flashing" },
    { code: "07 70 00", label: "Roof and Wall Specialties and Accessories" },
    { code: "07 71 00", label: "Roof Specialties" },
    { code: "07 72 00", label: "Roof Accessories" },
    { code: "07 76 00", label: "Roof Pavers" },
    { code: "07 77 00", label: "Wall Specialties" },
    { code: "07 80 00", label: "Fire and Smoke Protection" },
    { code: "07 81 00", label: "Applied Fireproofing" },
    { code: "07 82 00", label: "Board Fireproofing" },
    { code: "07 84 00", label: "Firestopping" },
    { code: "07 86 00", label: "Smoke Seals" },
    { code: "07 87 00", label: "Smoke Containment Barriers" },
    { code: "07 90 00", label: "Joint Protection" },
    { code: "07 91 00", label: "Preformed Joint Seals" },
    { code: "07 92 00", label: "Joint Sealants / Caulking" },
    { code: "07 95 00", label: "Expansion Control" }
  ]},
  { div: "08", label: "Openings", sections: [
    { code: "08 10 00", label: "Doors and Frames" },
    { code: "08 11 00", label: "Metal Doors and Frames" },
    { code: "08 12 00", label: "Metal Frames" },
    { code: "08 13 00", label: "Metal Doors" },
    { code: "08 14 00", label: "Wood Doors" },
    { code: "08 15 00", label: "Plastic Doors" },
    { code: "08 16 00", label: "Composite Doors" },
    { code: "08 17 00", label: "Integrated Door Opening Assemblies" },
    { code: "08 30 00", label: "Specialty Doors and Frames" },
    { code: "08 31 00", label: "Access Doors and Panels" },
    { code: "08 32 00", label: "Sliding Glass Doors" },
    { code: "08 33 00", label: "Coiling Doors and Grilles" },
    { code: "08 34 00", label: "Special Function Doors" },
    { code: "08 35 00", label: "Folding Doors and Grilles" },
    { code: "08 36 00", label: "Panel Doors / Overhead Doors" },
    { code: "08 38 00", label: "Traffic Doors" },
    { code: "08 39 00", label: "Pressure-Resistant Doors" },
    { code: "08 40 00", label: "Entrances, Storefronts and Curtain Walls" },
    { code: "08 41 00", label: "Entrances and Storefronts" },
    { code: "08 42 00", label: "Entrances" },
    { code: "08 43 00", label: "Storefronts" },
    { code: "08 44 00", label: "Curtain Wall and Glazed Assemblies" },
    { code: "08 45 00", label: "Translucent Wall and Roof Assemblies" },
    { code: "08 50 00", label: "Windows" },
    { code: "08 51 00", label: "Metal Windows" },
    { code: "08 52 00", label: "Wood Windows" },
    { code: "08 53 00", label: "Plastic Windows" },
    { code: "08 54 00", label: "Composite Windows" },
    { code: "08 55 00", label: "Pressure-Resistant Windows" },
    { code: "08 56 00", label: "Special Function Windows" },
    { code: "08 60 00", label: "Roof Windows and Skylights" },
    { code: "08 61 00", label: "Roof Windows" },
    { code: "08 62 00", label: "Unit Skylights" },
    { code: "08 63 00", label: "Metal-Framed Skylights" },
    { code: "08 64 00", label: "Plastic-Framed Skylights" },
    { code: "08 70 00", label: "Hardware" },
    { code: "08 71 00", label: "Door Hardware" },
    { code: "08 74 00", label: "Access Control Hardware" },
    { code: "08 75 00", label: "Window Hardware" },
    { code: "08 78 00", label: "Special Function Hardware" },
    { code: "08 80 00", label: "Glazing" },
    { code: "08 81 00", label: "Glass Glazing" },
    { code: "08 83 00", label: "Mirrors" },
    { code: "08 84 00", label: "Plastic Glazing" },
    { code: "08 85 00", label: "Glazing Accessories" },
    { code: "08 87 00", label: "Glazing Surface Films" },
    { code: "08 88 00", label: "Special Function Glazing" },
    { code: "08 90 00", label: "Louvers and Vents" },
    { code: "08 91 00", label: "Louvers" },
    { code: "08 95 00", label: "Vents" }
  ]},
  { div: "09", label: "Finishes", sections: [
    { code: "09 20 00", label: "Plaster and Gypsum Board" },
    { code: "09 21 00", label: "Plaster and Gypsum Board Assemblies" },
    { code: "09 22 00", label: "Supports for Plaster and Gypsum Board" },
    { code: "09 23 00", label: "Gypsum Plastering" },
    { code: "09 24 00", label: "Cement Plastering (Stucco)" },
    { code: "09 25 00", label: "Other Plastering" },
    { code: "09 26 00", label: "Veneer Plastering" },
    { code: "09 27 00", label: "Plaster Fabrications" },
    { code: "09 28 00", label: "Backing Boards and Underlayments" },
    { code: "09 29 00", label: "Gypsum Board (Drywall)" },
    { code: "09 30 00", label: "Tiling" },
    { code: "09 31 00", label: "Thin-Set Tiling" },
    { code: "09 32 00", label: "Mortar-Bed Tiling" },
    { code: "09 33 00", label: "Conductive Tiling" },
    { code: "09 34 00", label: "Waterproofing-Membrane Tiling" },
    { code: "09 35 00", label: "Chemical-Resistant Tiling" },
    { code: "09 50 00", label: "Ceilings" },
    { code: "09 51 00", label: "Acoustical Ceilings" },
    { code: "09 53 00", label: "Acoustical Ceiling Suspension Assemblies" },
    { code: "09 54 00", label: "Specialty Ceilings" },
    { code: "09 56 00", label: "Textured Ceilings" },
    { code: "09 57 00", label: "Special Function Ceilings" },
    { code: "09 58 00", label: "Integrated Ceiling Assemblies" },
    { code: "09 60 00", label: "Flooring" },
    { code: "09 61 00", label: "Flooring Treatment" },
    { code: "09 62 00", label: "Specialty Flooring" },
    { code: "09 63 00", label: "Masonry Flooring" },
    { code: "09 64 00", label: "Wood Flooring" },
    { code: "09 65 00", label: "Resilient Flooring (LVT / VCT)" },
    { code: "09 66 00", label: "Terrazzo Flooring" },
    { code: "09 67 00", label: "Fluid-Applied Flooring (Epoxy / Resinous)" },
    { code: "09 68 00", label: "Carpeting" },
    { code: "09 69 00", label: "Access Flooring" },
    { code: "09 70 00", label: "Wall Finishes" },
    { code: "09 72 00", label: "Wall Coverings" },
    { code: "09 73 00", label: "Wall Carpeting" },
    { code: "09 74 00", label: "Flexible Wood Sheets" },
    { code: "09 75 00", label: "Stone Facing" },
    { code: "09 76 00", label: "Plastic Blocks" },
    { code: "09 77 00", label: "Special Wall Surfacing" },
    { code: "09 78 00", label: "Interior Wall Paneling" },
    { code: "09 80 00", label: "Acoustic Treatment" },
    { code: "09 81 00", label: "Acoustic Insulation" },
    { code: "09 83 00", label: "Acoustic Finishes" },
    { code: "09 84 00", label: "Acoustic Room Components" },
    { code: "09 90 00", label: "Painting and Coating" },
    { code: "09 91 00", label: "Painting" },
    { code: "09 93 00", label: "Staining and Transparent Finishing" },
    { code: "09 94 00", label: "Decorative Finishing" },
    { code: "09 96 00", label: "High-Performance Coatings" },
    { code: "09 97 00", label: "Special Coatings" }
  ]},
  { div: "10", label: "Specialties", sections: [
    { code: "10 10 00", label: "Information Specialties" },
    { code: "10 11 00", label: "Visual Display Units" },
    { code: "10 12 00", label: "Display Cases" },
    { code: "10 13 00", label: "Directories" },
    { code: "10 14 00", label: "Signage" },
    { code: "10 20 00", label: "Interior Specialties" },
    { code: "10 21 00", label: "Compartments and Cubicles (Toilet Partitions)" },
    { code: "10 22 00", label: "Partitions" },
    { code: "10 25 00", label: "Service Walls" },
    { code: "10 26 00", label: "Wall and Door Protection" },
    { code: "10 28 00", label: "Toilet, Bath and Laundry Accessories" },
    { code: "10 30 00", label: "Fireplaces and Stoves" },
    { code: "10 31 00", label: "Manufactured Fireplaces" },
    { code: "10 40 00", label: "Safety Specialties" },
    { code: "10 41 00", label: "Emergency Access and Information Cabinets" },
    { code: "10 43 00", label: "Emergency Aid Specialties" },
    { code: "10 44 00", label: "Fire Protection Specialties" },
    { code: "10 50 00", label: "Storage Specialties" },
    { code: "10 51 00", label: "Lockers" },
    { code: "10 55 00", label: "Postal Specialties" },
    { code: "10 56 00", label: "Storage Assemblies" },
    { code: "10 57 00", label: "Wardrobe and Closet Specialties" },
    { code: "10 70 00", label: "Exterior Specialties" },
    { code: "10 71 00", label: "Exterior Protection (Awnings / Canopies)" },
    { code: "10 73 00", label: "Protective Covers" },
    { code: "10 74 00", label: "Manufactured Exterior Specialties" },
    { code: "10 75 00", label: "Flagpoles" },
    { code: "10 80 00", label: "Other Specialties" },
    { code: "10 81 00", label: "Pest Control Devices" },
    { code: "10 82 00", label: "Grilles and Screens" },
    { code: "10 86 00", label: "Security Mirrors and Domes" }
  ]},
  { div: "11", label: "Equipment", sections: [
    { code: "11 10 00", label: "Vehicle and Pedestrian Equipment" },
    { code: "11 11 00", label: "Vehicle Service Equipment" },
    { code: "11 12 00", label: "Parking Control Equipment" },
    { code: "11 13 00", label: "Loading Dock Equipment" },
    { code: "11 14 00", label: "Pedestrian Control Equipment" },
    { code: "11 15 00", label: "Security, Detention and Banking Equipment" },
    { code: "11 19 00", label: "Detention Equipment" },
    { code: "11 20 00", label: "Commercial Equipment" },
    { code: "11 21 00", label: "Mercantile and Service Equipment" },
    { code: "11 22 00", label: "Refrigerated Display Equipment" },
    { code: "11 23 00", label: "Commercial Laundry and Dry Cleaning Equipment" },
    { code: "11 24 00", label: "Maintenance Equipment" },
    { code: "11 25 00", label: "Hospitality Equipment" },
    { code: "11 26 00", label: "Unit Kitchens" },
    { code: "11 30 00", label: "Residential Equipment" },
    { code: "11 31 00", label: "Residential Appliances" },
    { code: "11 40 00", label: "Foodservice Equipment" },
    { code: "11 41 00", label: "Foodservice Storage Equipment" },
    { code: "11 42 00", label: "Food Preparation Equipment" },
    { code: "11 44 00", label: "Food Cooking Equipment" },
    { code: "11 46 00", label: "Food Dispensing Equipment" },
    { code: "11 47 00", label: "Ice Machines" },
    { code: "11 48 00", label: "Cleaning and Disposal Equipment" },
    { code: "11 50 00", label: "Educational and Scientific Equipment" },
    { code: "11 51 00", label: "Library Equipment" },
    { code: "11 52 00", label: "Audio-Visual Equipment" },
    { code: "11 53 00", label: "Laboratory Equipment" },
    { code: "11 60 00", label: "Entertainment Equipment" },
    { code: "11 61 00", label: "Broadcast, Theater and Stage Equipment" },
    { code: "11 65 00", label: "Athletic and Recreational Equipment" },
    { code: "11 66 00", label: "Athletic Equipment" },
    { code: "11 67 00", label: "Recreational Equipment" },
    { code: "11 68 00", label: "Play Field Equipment and Structures" },
    { code: "11 70 00", label: "Healthcare Equipment" },
    { code: "11 71 00", label: "Medical Sterilizing Equipment" },
    { code: "11 72 00", label: "Examination and Treatment Equipment" },
    { code: "11 73 00", label: "Patient Care Equipment" },
    { code: "11 74 00", label: "Dental Equipment" },
    { code: "11 76 00", label: "Operating Room Equipment" },
    { code: "11 77 00", label: "Radiology Equipment" },
    { code: "11 80 00", label: "Collection and Disposal Equipment" },
    { code: "11 82 00", label: "Solid Waste Handling Equipment" }
  ]},
  { div: "12", label: "Furnishings", sections: [
    { code: "12 10 00", label: "Art" },
    { code: "12 11 00", label: "Murals" },
    { code: "12 20 00", label: "Window Treatments" },
    { code: "12 21 00", label: "Window Blinds" },
    { code: "12 22 00", label: "Curtains and Drapes" },
    { code: "12 23 00", label: "Interior Shutters" },
    { code: "12 24 00", label: "Window Shades" },
    { code: "12 30 00", label: "Casework" },
    { code: "12 31 00", label: "Manufactured Metal Casework" },
    { code: "12 32 00", label: "Manufactured Wood Casework" },
    { code: "12 34 00", label: "Manufactured Plastic Casework" },
    { code: "12 35 00", label: "Specialty Casework" },
    { code: "12 36 00", label: "Countertops" },
    { code: "12 40 00", label: "Furnishings and Accessories" },
    { code: "12 41 00", label: "Office Accessories" },
    { code: "12 48 00", label: "Rugs and Mats" },
    { code: "12 50 00", label: "Furniture" },
    { code: "12 51 00", label: "Office Furniture" },
    { code: "12 52 00", label: "Seating" },
    { code: "12 54 00", label: "Hospitality Furniture" },
    { code: "12 56 00", label: "Institutional Furniture" },
    { code: "12 59 00", label: "Systems Furniture" },
    { code: "12 60 00", label: "Multiple Seating" },
    { code: "12 61 00", label: "Fixed Audience Seating" },
    { code: "12 63 00", label: "Stadium and Arena Seating" },
    { code: "12 64 00", label: "Booths and Tables" },
    { code: "12 66 00", label: "Telescoping Stands" },
    { code: "12 67 00", label: "Pews and Benches" },
    { code: "12 93 00", label: "Site Furnishings" }
  ]},
  { div: "13", label: "Special Construction", sections: [
    { code: "13 10 00", label: "Special Facility Components" },
    { code: "13 11 00", label: "Swimming Pools" },
    { code: "13 12 00", label: "Fountains" },
    { code: "13 13 00", label: "Aquariums" },
    { code: "13 14 00", label: "Amusement Park Structures and Equipment" },
    { code: "13 17 00", label: "Tubs and Pools" },
    { code: "13 18 00", label: "Ice Rinks" },
    { code: "13 19 00", label: "Kennels and Animal Shelters" },
    { code: "13 20 00", label: "Special Purpose Rooms" },
    { code: "13 21 00", label: "Controlled Environment Rooms (Clean Rooms)" },
    { code: "13 22 00", label: "Office Shelters and Booths" },
    { code: "13 24 00", label: "Special Activity Rooms" },
    { code: "13 26 00", label: "Fabricated Rooms" },
    { code: "13 27 00", label: "Vaults" },
    { code: "13 28 00", label: "Athletic and Recreational Special Construction" },
    { code: "13 30 00", label: "Special Structures" },
    { code: "13 31 00", label: "Fabric Structures" },
    { code: "13 32 00", label: "Space Frames" },
    { code: "13 34 00", label: "Fabricated Engineered Structures" },
    { code: "13 36 00", label: "Towers" },
    { code: "13 40 00", label: "Integrated Construction" },
    { code: "13 42 00", label: "Building Modules" },
    { code: "13 44 00", label: "Modular Mezzanines" },
    { code: "13 48 00", label: "Sound, Vibration and Seismic Control" },
    { code: "13 49 00", label: "Radiation Protection" }
  ]},
  { div: "14", label: "Conveying Equipment", sections: [
    { code: "14 10 00", label: "Dumbwaiters" },
    { code: "14 11 00", label: "Manual Dumbwaiters" },
    { code: "14 12 00", label: "Electric Dumbwaiters" },
    { code: "14 14 00", label: "Hydraulic Dumbwaiters" },
    { code: "14 20 00", label: "Elevators" },
    { code: "14 21 00", label: "Electric Traction Elevators" },
    { code: "14 24 00", label: "Hydraulic Elevators" },
    { code: "14 26 00", label: "Limited-Use/Limited-Application Elevators" },
    { code: "14 27 00", label: "Custom Elevator Cabs and Doors" },
    { code: "14 28 00", label: "Elevator Equipment and Controls" },
    { code: "14 30 00", label: "Escalators and Moving Walks" },
    { code: "14 31 00", label: "Escalators" },
    { code: "14 32 00", label: "Moving Walks" },
    { code: "14 40 00", label: "Lifts" },
    { code: "14 41 00", label: "People Lifts" },
    { code: "14 42 00", label: "Wheelchair Lifts" },
    { code: "14 43 00", label: "Platform Lifts" },
    { code: "14 45 00", label: "Vehicle Lifts" },
    { code: "14 70 00", label: "Turntables" },
    { code: "14 80 00", label: "Scaffolding" },
    { code: "14 81 00", label: "Suspended Scaffolding" },
    { code: "14 83 00", label: "Elevating Platforms" },
    { code: "14 91 00", label: "Facility Chutes" },
    { code: "14 92 00", label: "Pneumatic Tube Systems" }
  ]},
  { div: "21", label: "Fire Suppression", sections: [
    { code: "21 05 00", label: "Common Work Results for Fire Suppression" },
    { code: "21 09 00", label: "Instrumentation and Control for Fire-Suppression Systems" },
    { code: "21 10 00", label: "Water-Based Fire-Suppression Systems" },
    { code: "21 11 00", label: "Facility Fire-Suppression Water-Service Piping" },
    { code: "21 12 00", label: "Fire-Suppression Standpipes" },
    { code: "21 13 00", label: "Fire-Suppression Sprinkler Systems" },
    { code: "21 16 00", label: "Fire-Suppression Pressure Maintenance Pumps" },
    { code: "21 20 00", label: "Fire-Extinguishing Systems" },
    { code: "21 21 00", label: "Carbon-Dioxide Fire-Extinguishing Systems" },
    { code: "21 22 00", label: "Clean-Agent Fire-Extinguishing Systems" },
    { code: "21 23 00", label: "Wet-Chemical Fire-Extinguishing Systems" },
    { code: "21 24 00", label: "Dry-Chemical Fire-Extinguishing Systems" },
    { code: "21 30 00", label: "Fire Pumps" },
    { code: "21 31 00", label: "Centrifugal Fire Pumps" },
    { code: "21 40 00", label: "Fire-Suppression Water Storage" },
    { code: "21 41 00", label: "Storage Tanks for Fire-Suppression Water" }
  ]},
  { div: "22", label: "Plumbing", sections: [
    { code: "22 05 00", label: "Common Work Results for Plumbing" },
    { code: "22 07 00", label: "Plumbing Insulation" },
    { code: "22 09 00", label: "Instrumentation and Control for Plumbing" },
    { code: "22 10 00", label: "Plumbing Piping" },
    { code: "22 11 00", label: "Facility Water Distribution" },
    { code: "22 12 00", label: "Facility Potable-Water Storage Tanks" },
    { code: "22 13 00", label: "Facility Sanitary Sewerage" },
    { code: "22 14 00", label: "Facility Storm Drainage" },
    { code: "22 15 00", label: "General Service Compressed-Air Systems" },
    { code: "22 30 00", label: "Plumbing Equipment" },
    { code: "22 31 00", label: "Domestic Water Softeners" },
    { code: "22 33 00", label: "Electric Domestic Water Heaters" },
    { code: "22 34 00", label: "Fuel-Fired Domestic Water Heaters" },
    { code: "22 35 00", label: "Domestic Water Heat Exchangers" },
    { code: "22 40 00", label: "Plumbing Fixtures" },
    { code: "22 41 00", label: "Residential Plumbing Fixtures" },
    { code: "22 42 00", label: "Commercial Plumbing Fixtures" },
    { code: "22 43 00", label: "Healthcare Plumbing Fixtures" },
    { code: "22 45 00", label: "Emergency Plumbing Fixtures" },
    { code: "22 47 00", label: "Drinking Fountains and Water Coolers" },
    { code: "22 50 00", label: "Pool and Fountain Plumbing Systems" },
    { code: "22 51 00", label: "Swimming Pool Plumbing Systems" },
    { code: "22 52 00", label: "Fountain Plumbing Systems" }
  ]},
  { div: "23", label: "Heating, Ventilating and Air Conditioning (HVAC)", sections: [
    { code: "23 05 00", label: "Common Work Results for HVAC" },
    { code: "23 07 00", label: "HVAC Insulation" },
    { code: "23 09 00", label: "Instrumentation and Control for HVAC" },
    { code: "23 10 00", label: "Facility Fuel Systems" },
    { code: "23 11 00", label: "Facility Fuel Piping" },
    { code: "23 13 00", label: "Facility Fuel-Storage Tanks" },
    { code: "23 20 00", label: "HVAC Piping and Pumps" },
    { code: "23 21 00", label: "Hydronic Piping and Pumps" },
    { code: "23 22 00", label: "Steam and Condensate Piping and Pumps" },
    { code: "23 23 00", label: "Refrigerant Piping" },
    { code: "23 25 00", label: "HVAC Water Treatment" },
    { code: "23 30 00", label: "HVAC Air Distribution" },
    { code: "23 31 00", label: "HVAC Ducts and Casings" },
    { code: "23 33 00", label: "Air Duct Accessories" },
    { code: "23 34 00", label: "HVAC Fans" },
    { code: "23 35 00", label: "Special Exhaust Systems" },
    { code: "23 36 00", label: "Air Terminal Units" },
    { code: "23 37 00", label: "Air Outlets and Inlets" },
    { code: "23 38 00", label: "Ventilation Hoods" },
    { code: "23 40 00", label: "HVAC Air Cleaning Devices" },
    { code: "23 41 00", label: "Particulate Air Filtration" },
    { code: "23 50 00", label: "Central Heating Equipment" },
    { code: "23 52 00", label: "Heating Boilers" },
    { code: "23 54 00", label: "Furnaces" },
    { code: "23 55 00", label: "Fuel-Fired Heaters" },
    { code: "23 57 00", label: "Heat Exchangers for HVAC" },
    { code: "23 60 00", label: "Central Cooling Equipment" },
    { code: "23 62 00", label: "Packaged Compressor and Condenser Units" },
    { code: "23 64 00", label: "Packaged Water Chillers" },
    { code: "23 65 00", label: "Cooling Towers" },
    { code: "23 70 00", label: "Central HVAC Equipment" },
    { code: "23 72 00", label: "Air-to-Air Energy Recovery Equipment" },
    { code: "23 73 00", label: "Indoor Central-Station Air-Handling Units" },
    { code: "23 74 00", label: "Packaged Outdoor HVAC Equipment" },
    { code: "23 75 00", label: "Custom-Packaged Outdoor HVAC Equipment" },
    { code: "23 76 00", label: "Evaporative Air-Cooling Equipment" },
    { code: "23 80 00", label: "Decentralized HVAC Equipment" },
    { code: "23 81 00", label: "Decentralized Unitary HVAC Equipment" },
    { code: "23 82 00", label: "Convection Heating and Cooling Units" },
    { code: "23 83 00", label: "Radiant Heating Units" },
    { code: "23 84 00", label: "Humidity Control Equipment" }
  ]},
  { div: "25", label: "Integrated Automation", sections: [
    { code: "25 10 00", label: "Integrated Automation Network Equipment" },
    { code: "25 11 00", label: "Integrated Automation Network Devices" },
    { code: "25 12 00", label: "Integrated Automation Network Gateways" },
    { code: "25 13 00", label: "Integrated Automation Control and Monitoring Network" },
    { code: "25 14 00", label: "Integrated Automation Local Control Units" },
    { code: "25 15 00", label: "Integrated Automation Software" },
    { code: "25 30 00", label: "Integrated Automation Instrumentation and Terminal Devices" },
    { code: "25 50 00", label: "Integrated Automation Facility Controls" },
    { code: "25 55 00", label: "Integrated Automation Control of HVAC" },
    { code: "25 56 00", label: "Integrated Automation Control of Electrical Systems" },
    { code: "25 90 00", label: "Integrated Automation Control Sequences" }
  ]},
  { div: "26", label: "Electrical", sections: [
    { code: "26 05 00", label: "Common Work Results for Electrical" },
    { code: "26 09 00", label: "Instrumentation and Control for Electrical Systems" },
    { code: "26 10 00", label: "Medium-Voltage Electrical Distribution" },
    { code: "26 11 00", label: "Substations" },
    { code: "26 12 00", label: "Medium-Voltage Transformers" },
    { code: "26 13 00", label: "Medium-Voltage Switchgear" },
    { code: "26 20 00", label: "Low-Voltage Electrical Transmission" },
    { code: "26 21 00", label: "Low-Voltage Electrical Service Entrance" },
    { code: "26 22 00", label: "Low-Voltage Transformers" },
    { code: "26 23 00", label: "Low-Voltage Switchgear" },
    { code: "26 24 00", label: "Switchboards and Panelboards" },
    { code: "26 25 00", label: "Enclosed Bus Assemblies" },
    { code: "26 27 00", label: "Low-Voltage Distribution Equipment" },
    { code: "26 28 00", label: "Low-Voltage Circuit Protective Devices" },
    { code: "26 29 00", label: "Low-Voltage Controllers (Motor Starters)" },
    { code: "26 31 00", label: "Photovoltaic Collectors" },
    { code: "26 32 00", label: "Packaged Generator Assemblies" },
    { code: "26 33 00", label: "Battery Equipment" },
    { code: "26 35 00", label: "Power Filters and Conditioners (UPS)" },
    { code: "26 36 00", label: "Transfer Switches" },
    { code: "26 41 00", label: "Facility Lightning Protection" },
    { code: "26 42 00", label: "Cathodic Protection" },
    { code: "26 43 00", label: "Surge Protective Devices" },
    { code: "26 50 00", label: "Lighting" },
    { code: "26 51 00", label: "Interior Lighting" },
    { code: "26 52 00", label: "Emergency Lighting" },
    { code: "26 53 00", label: "Exit Signs" },
    { code: "26 55 00", label: "Special Purpose Lighting" },
    { code: "26 56 00", label: "Exterior Lighting" }
  ]},
  { div: "27", label: "Communications", sections: [
    { code: "27 05 00", label: "Common Work Results for Communications" },
    { code: "27 10 00", label: "Structured Cabling" },
    { code: "27 11 00", label: "Communications Equipment Room Fittings" },
    { code: "27 13 00", label: "Communications Backbone Cabling" },
    { code: "27 15 00", label: "Communications Horizontal Cabling" },
    { code: "27 16 00", label: "Communications Connecting Cords, Devices and Adapters" },
    { code: "27 20 00", label: "Data Communications" },
    { code: "27 21 00", label: "Data Communications Network Equipment" },
    { code: "27 22 00", label: "Data Communications Hardware" },
    { code: "27 30 00", label: "Voice Communications" },
    { code: "27 31 00", label: "Voice Communications Switching and Routing Equipment" },
    { code: "27 32 00", label: "Voice Communications Terminal Equipment" },
    { code: "27 40 00", label: "Audio-Video Communications" },
    { code: "27 41 00", label: "Audio-Video Systems" },
    { code: "27 42 00", label: "Electronic Digital Systems" },
    { code: "27 51 00", label: "Distributed Audio-Video Communications Systems" },
    { code: "27 52 00", label: "Healthcare Communications and Monitoring Systems" }
  ]},
  { div: "28", label: "Electronic Safety and Security", sections: [
    { code: "28 05 00", label: "Common Work Results for Electronic Safety and Security" },
    { code: "28 10 00", label: "Electronic Access Control and Intrusion Detection" },
    { code: "28 13 00", label: "Access Control" },
    { code: "28 16 00", label: "Intrusion Detection" },
    { code: "28 20 00", label: "Electronic Surveillance" },
    { code: "28 23 00", label: "Video Surveillance (CCTV)" },
    { code: "28 26 00", label: "Electronic Personal Protection Systems" },
    { code: "28 30 00", label: "Electronic Detection and Alarm" },
    { code: "28 31 00", label: "Fire Detection and Alarm" },
    { code: "28 32 00", label: "Radiation Detection and Alarm" },
    { code: "28 33 00", label: "Gas Detection and Alarm" },
    { code: "28 36 00", label: "Water Detection and Alarm" },
    { code: "28 39 00", label: "Mass Notification Systems" },
    { code: "28 40 00", label: "Electronic Monitoring and Control" },
    { code: "28 46 00", label: "Electronic Detention Monitoring and Control Systems" }
  ]},
  { div: "31", label: "Earthwork", sections: [
    { code: "31 10 00", label: "Site Clearing" },
    { code: "31 11 00", label: "Clearing and Grubbing" },
    { code: "31 12 00", label: "Selective Clearing" },
    { code: "31 14 00", label: "Earth Stripping and Stockpiling" },
    { code: "31 20 00", label: "Earth Moving" },
    { code: "31 22 00", label: "Grading" },
    { code: "31 23 00", label: "Excavation and Fill" },
    { code: "31 24 00", label: "Embankments" },
    { code: "31 25 00", label: "Erosion and Sedimentation Controls" },
    { code: "31 30 00", label: "Earthwork Methods" },
    { code: "31 31 00", label: "Soil Treatment" },
    { code: "31 32 00", label: "Soil Stabilization" },
    { code: "31 33 00", label: "Rock Stabilization" },
    { code: "31 34 00", label: "Soil Reinforcement" },
    { code: "31 35 00", label: "Slope Protection" },
    { code: "31 40 00", label: "Shoring and Underpinning" },
    { code: "31 41 00", label: "Shoring" },
    { code: "31 43 00", label: "Concrete Raising" },
    { code: "31 48 00", label: "Underpinning" },
    { code: "31 50 00", label: "Excavation Support and Protection" },
    { code: "31 51 00", label: "Anchor Tiebacks" },
    { code: "31 52 00", label: "Cofferdams" },
    { code: "31 56 00", label: "Slurry Walls" },
    { code: "31 60 00", label: "Special Foundations and Load-Bearing Elements" },
    { code: "31 62 00", label: "Driven Piles" },
    { code: "31 63 00", label: "Bored Piles" },
    { code: "31 64 00", label: "Caissons" },
    { code: "31 66 00", label: "Special Foundations" },
    { code: "31 68 00", label: "Foundation Anchors" }
  ]},
  { div: "32", label: "Exterior Improvements", sections: [
    { code: "32 10 00", label: "Bases, Ballasts and Paving" },
    { code: "32 11 00", label: "Base Courses" },
    { code: "32 12 00", label: "Flexible Paving (Asphalt)" },
    { code: "32 13 00", label: "Rigid Paving (Concrete)" },
    { code: "32 14 00", label: "Unit Paving (Pavers / Brick)" },
    { code: "32 15 00", label: "Aggregate Surfacing" },
    { code: "32 16 00", label: "Curbs, Gutters, Sidewalks and Driveways" },
    { code: "32 17 00", label: "Paving Specialties (Striping / Marking)" },
    { code: "32 18 00", label: "Athletic and Recreational Surfacing" },
    { code: "32 30 00", label: "Site Improvements" },
    { code: "32 31 00", label: "Fences and Gates" },
    { code: "32 32 00", label: "Retaining Walls" },
    { code: "32 34 00", label: "Fabricated Bridges" },
    { code: "32 35 00", label: "Screening Devices" },
    { code: "32 39 00", label: "Manufactured Site Specialties" },
    { code: "32 70 00", label: "Wetlands" },
    { code: "32 71 00", label: "Constructed Wetlands" },
    { code: "32 80 00", label: "Irrigation" },
    { code: "32 84 00", label: "Planting Irrigation" },
    { code: "32 90 00", label: "Planting / Landscaping" },
    { code: "32 91 00", label: "Planting Preparation" },
    { code: "32 92 00", label: "Turf and Grasses" },
    { code: "32 93 00", label: "Plants" },
    { code: "32 94 00", label: "Planting Accessories" },
    { code: "32 96 00", label: "Transplanting" }
  ]},
  { div: "33", label: "Utilities", sections: [
    { code: "33 05 00", label: "Common Work Results for Utilities" },
    { code: "33 09 00", label: "Instrumentation and Control for Utilities" },
    { code: "33 10 00", label: "Water Utilities" },
    { code: "33 11 00", label: "Water Utility Distribution Piping" },
    { code: "33 12 00", label: "Water Utility Distribution Equipment" },
    { code: "33 13 00", label: "Disinfecting of Water Utility Distribution" },
    { code: "33 16 00", label: "Water Utility Storage Tanks" },
    { code: "33 20 00", label: "Wells" },
    { code: "33 21 00", label: "Water Supply Wells" },
    { code: "33 24 00", label: "Monitoring Wells" },
    { code: "33 30 00", label: "Sanitary Sewerage Utilities" },
    { code: "33 31 00", label: "Sanitary Utility Sewerage Piping" },
    { code: "33 32 00", label: "Wastewater Utility Pumping Stations" },
    { code: "33 34 00", label: "Sanitary Utility Sewerage Force Mains" },
    { code: "33 36 00", label: "Utility Septic Tanks" },
    { code: "33 39 00", label: "Sanitary Utility Sewerage Structures" },
    { code: "33 40 00", label: "Storm Drainage Utilities" },
    { code: "33 41 00", label: "Storm Utility Drainage Piping" },
    { code: "33 42 00", label: "Culverts" },
    { code: "33 44 00", label: "Storm Utility Water Drains" },
    { code: "33 46 00", label: "Subdrainage" },
    { code: "33 47 00", label: "Ponds and Reservoirs" },
    { code: "33 49 00", label: "Storm Drainage Structures" },
    { code: "33 50 00", label: "Fuel Distribution Utilities" },
    { code: "33 51 00", label: "Natural-Gas Distribution" },
    { code: "33 52 00", label: "Liquid Fuel Distribution" },
    { code: "33 56 00", label: "Fuel-Storage Tanks" },
    { code: "33 60 00", label: "Hydronic and Steam Energy Utilities" },
    { code: "33 61 00", label: "Hydronic Energy Distribution" },
    { code: "33 63 00", label: "Steam Energy Distribution" },
    { code: "33 70 00", label: "Electrical Utilities" },
    { code: "33 71 00", label: "Electrical Utility Transmission and Distribution" },
    { code: "33 72 00", label: "Utility Substations" },
    { code: "33 73 00", label: "Utility Transformers" },
    { code: "33 79 00", label: "Site Grounding" },
    { code: "33 80 00", label: "Communications Utilities" },
    { code: "33 81 00", label: "Communications Structures" },
    { code: "33 82 00", label: "Communications Distribution" },
    { code: "33 83 00", label: "Wireless Communications Distribution" }
  ]}
];
```

---

## CHANGE 3: COLLAPSIBLE CSI PICKER UI COMPONENT
Create a reusable function `renderCSIPicker(containerId, selectedSections, onChange)` in the Utilities section of app.html.

**UI behavior:**
- Each division renders as a clickable header row: `[▶] 09 — Finishes  (3 of 47 selected)`
- Clicking the header toggles expand/collapse (chevron rotates 90 degrees)
- When expanded, all sections for that division appear as indented checkboxes
- Checking any section updates the selected count badge on the parent division header
- "Select All" / "Clear All" links appear at the top of each expanded panel
- Division headers are NOT checkboxes — clicking only expands/collapses
- Users must check individual sections

**CSS to add** (use existing CSS variable names from app.html — do not introduce new color values):
```css
.csi-picker { border: 1px solid var(--border); border-radius: 8px; overflow: hidden; margin-top: 8px; }
.csi-division-row {
  display: flex; align-items: center; gap: 8px; padding: 10px 14px;
  cursor: pointer; background: var(--bg-secondary); border-bottom: 1px solid var(--border);
  user-select: none; font-weight: 500; font-size: 14px;
}
.csi-division-row:hover { background: var(--bg-hover); }
.csi-division-chevron { transition: transform 0.2s; font-size: 11px; color: var(--text-muted); flex-shrink: 0; }
.csi-division-row.open .csi-division-chevron { transform: rotate(90deg); }
.csi-division-label { flex: 1; }
.csi-division-num { color: var(--text-muted); font-size: 12px; margin-right: 4px; }
.csi-division-count { font-size: 12px; color: var(--accent); font-weight: 600; white-space: nowrap; }
.csi-division-count.zero { color: var(--text-muted); font-weight: 400; }
.csi-sections-panel { display: none; background: var(--bg-primary); border-bottom: 1px solid var(--border); }
.csi-sections-panel.open { display: block; }
.csi-section-actions { display: flex; gap: 16px; padding: 8px 40px 4px; font-size: 12px; }
.csi-section-action-link { cursor: pointer; color: var(--accent); text-decoration: underline; }
.csi-section-action-link:hover { opacity: 0.75; }
.csi-section-item { display: flex; align-items: center; padding: 4px 16px 4px 40px; font-size: 13px; color: var(--text-primary); }
.csi-section-item:hover { background: var(--bg-secondary); }
.csi-section-item label { cursor: pointer; display: flex; align-items: center; gap: 10px; width: 100%; }
.csi-section-code { color: var(--text-muted); font-family: monospace; font-size: 11px; min-width: 64px; flex-shrink: 0; }
.csi-picker-search { width: 100%; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; font-size: 13px; margin-bottom: 8px; background: var(--bg-primary); color: var(--text-primary); box-sizing: border-box; }
```

**Search/filter:** A text input above the picker with `placeholder="Filter divisions or sections..."` — typing filters to show only divisions that contain matching section labels or division names. Divisions with zero matches collapse and hide.

---

## CHANGE 4: REPLACE SETTINGS TAB TRADE SECTION
In the Settings tab, replace the existing flat CSI division checkboxes with the new collapsible picker.

- Section heading: **"Your Trade Scope"**
- Helper text: *"Click any division to expand it, then check the specific sections you bid. More specific = more accurate BidIndex scores."*
- Add the filter search input above the picker
- On settings load: call `renderCSIPicker('csi-picker-settings', userSettings.preferred_csi_sections || [], (newSections) => { pendingSettings.preferred_csi_sections = newSections; })`
- On save: include `preferred_csi_sections` as TEXT[] in the existing Supabase settings save
- Backward compatibility: if `preferred_csi_sections` is empty array, existing division-level trade matching continues unchanged — no regression

---

## CHANGE 5: OUTCOME TRACKING MODAL — SCOPE CONFIRMATION
In the outcome tracking modal, BEFORE the Won/Lost/Ghost/No Bid buttons, add:

**Label:** *"What scope did you submit on this project?"*
**Helper text:** *"Pre-filled from your profile — uncheck anything you didn't price."*

- On modal open: read `preferred_csi_sections` from cached user settings
- If sections exist (length > 0): render the CSI picker with all user sections pre-checked
- If no sections saved: fall back to showing `preferred_divisions` as simple checkboxes (no regression)
- Require at least 1 item checked to enable the save button; show inline error if zero: *"Select at least one scope section you submitted."*
- On outcome save: write checked codes to `bids.bid_divisions_submitted` as TEXT[]
- If using division fallback, write division codes instead

---

## TRADE MATCH SCORING UPDATE
In `calculateScore`, update the Trade Match component to use section-level matching when available:

```javascript
// If user has preferred_csi_sections, use section-level matching (more precise)
// Otherwise fall back to existing division-level logic unchanged

function getTradeScore(extracted, userSettings) {
  const userSections = userSettings.preferred_csi_sections || [];
  if (userSections.length === 0) {
    return existingDivisionLevelTradeMatch(extracted, userSettings); // no change
  }
  const bidText = (extracted.raw_text || extracted.description || '').toLowerCase();
  const allSections = CSI_DIVISIONS.flatMap(d => d.sections);
  const matches = userSections.filter(code => {
    const section = allSections.find(s => s.code === code);
    const codeNormalized = code.replace(/ /g, '');
    return bidText.includes(codeNormalized) ||
           bidText.includes(code.toLowerCase()) ||
           (section && bidText.includes(section.label.toLowerCase().split('(')[0].trim()));
  });
  if (matches.length === 0) return 15;
  const ratio = matches.length / Math.min(userSections.length, 5);
  return Math.min(100, Math.round(ratio * 100));
}
```

---

## CONSTRAINTS
- Do NOT change BidIndex score weights (Location 30%, Keywords 25%, GC 25%, Trade 20%)
- Do NOT touch geolocation, auth, email, or Stripe code
- Backward compatible: empty `preferred_csi_sections` means existing division logic runs unchanged
- Existing projects and scores must not be affected
- Commit after schema migration, commit again after all UI/JS changes complete

## TESTING CHECKLIST
- [ ] All 22 divisions present in Settings picker (03 through 33)
- [ ] Clicking division header expands/collapses sections
- [ ] Checking sections updates count badge on division header
- [ ] Select All / Clear All work per division
- [ ] Filter search narrows visible divisions correctly
- [ ] Selected sections save correctly to Supabase preferred_csi_sections
- [ ] Settings reload pre-checks previously saved sections
- [ ] Outcome modal pre-populates with user's saved sections
- [ ] Outcome save writes bid_divisions_submitted to database
- [ ] Zero-selection validation blocks save with error message
- [ ] Division fallback works correctly when no sections are configured
- [ ] Trade match score reflects section-level matching when sections are set
