export class CreateCardDto {

    /* example scryfall image requests:
        "https://cards.scryfall.io/small/front/d/5/d573ef03-4730-45aa-93dd-e45ac1dbaf4a.jpg",
        "https://cards.scryfall.io/normal/front/d/5/d573ef03-4730-45aa-93dd-e45ac1dbaf4a.jpg",
        "https://cards.scryfall.io/large/front/d/5/d573ef03-4730-45aa-93dd-e45ac1dbaf4a.jpg",
        "https://cards.scryfall.io/png/front/d/5/d573ef03-4730-45aa-93dd-e45ac1dbaf4a.png",
        "https://cards.scryfall.io/art_crop/front/d/5/d573ef03-4730-45aa-93dd-e45ac1dbaf4a.jpg"

        ==> SCRYFALL_IMAGE_URL + SCRYFALL_IMAGE_FORMATS[0] + "/" + SCRYFALL_IMAGE_SIDES[0] + "/" 
                + cardSet.scryfallId[0] + "/" + cardSet.scryFallId[1] 
                + "/" cardSet.scryFallId + "." + "jpg"
        
        * replace "jpg" for "png" if SCRYFALL_IMAGE_FORMATS[3] chosen
    */
}
