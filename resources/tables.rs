use yeti_core::prelude::*;

// Products: public read-only (query demo)
resource!(TableExtender for Products {
    get => allow_read(),
});

// Brand: public read-only (joined from Products)
resource!(TableExtender for Brand {
    get => allow_read(),
});
