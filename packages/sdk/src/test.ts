import { LinxClient, isEntityType } from "./"

// 1. Create unauthenticated client
const client = new LinxClient({ baseUrl: 'http://localhost:3333' })

// 2. Register a new Organization account (only action available unauthenticated)
const registration = await client.register({
    email: 'dev@example.com',
    password: 'secret123',
    accountType: 'Organization',
    name: 'Acme Corp',
})

// 3. Authenticate with an API key (once per session)
//    The returned client is immediately usable — app-only mode
const linx = await client.authenticate('oat_abc123...')

// 4a. Use entity methods directly (app-only mode)
//     All SDK methods throw on error and return data directly
const stationsResult = await linx.gasStation
    .list()         // GET /Place?depth=1&page=1&perPage=20
    .catch((error) => {
        return console.error(error); // Network or unexpected errors are caught here
    })

// Suggestions are pre-loaded in the background after entity fetch.
// Access them synchronously — no async chaining needed:
const firstStation = stationsResult?.data?.[0]
const test = firstStation?.amenityFeature?.["atm"].suggestions[0]?.value.name
// Structured value properties use discriminated union narrowing via .type:
const geoFactoid = firstStation?.geo
if (geoFactoid?.type === "GeoCoordinates") {
    const test1 = geoFactoid.value.latitude;              // ✓ narrowed to GeoCoordinates
    const test2 = geoFactoid.value.longitude;             // ✓
}

firstStation?.geo?.type === "GeoCoordinates" && firstStation.geo.value.latitude
const nameValue = firstStation?.name?.suggestions[0]?.value               // string — typed!
const nameConfidence = firstStation?.name?.suggestions[0]?.confidence       // number
// Entity-type properties are RootFactoid<HydratedEntityInstance<T>> at runtime.
// FactoidMap-typed properties (e.g., amenityFeature) are Record<string, RootFactoid<T>>.
// Pagination on suggestions:
const moreSuggestions = await firstStation?.name?.suggestions.nextPage()     // fetch page 2

// 4b. Paginate through results
await linx.gasStation
    .list({ page: 2, perPage: 10 })
    .then(async (res) => {
        if (res.meta!.currentPage < res.meta!.lastPage) {
            await res.nextPage()!                  // Fetch next page automatically
            await res.requestPage(5)               // Jump to a specific page
        }
    })


// 4c. Fetch with custom depth (default is 1 — resolves one level of entity refs)
const deepResult = await linx.gasStation('id', { depth: 2 })
    .then(async (station) => {
        // Entity-type properties are always arrays: RootFactoid<HydratedEntityInstance<T>>[]
        // Each element is a RootFactoid wrapping a hydrated child entity.
        const containedIn = station.containedInPlace          // RootFactoid<Place>[] | undefined
        const firstPlace = containedIn?.[0]                   // RootFactoid<Place> | undefined
        console.log(firstPlace?.type)                         // 'Place'
        console.log(isEntityType(firstPlace?.type!))          // true

        // Access nested entity properties via .value
        const place = firstPlace?.value                       // HydratedEntityInstance<Place>
        console.log(place?.name?.value)                       // "Membury" — nested entity property

        // Vote on individual entity relationship links
        await firstPlace?.upvote()

        // Archive a specific relationship link (not the entity itself)
        await firstPlace?.archive()

        // Iterate over all contained places
        for (const link of station.containsPlace ?? []) {
            console.log(link.value.name?.value)               // each contained Place's name
        }
    })


// 4d. Start interacting as a specific UserAccount
//     Sources will reference both the application and the user
const session = await linx.as(registration.userAccount.id)

// 5. Fetch and read a single entity
await session.gasStation("id")
    .then(async (station) => {
        // Entity attributes may be undefined — use optional chaining
        console.log(station.name?.value)                      // "Membury Services"
        console.log(station.name?.confidence)                  // 0.95
        console.log(station.name?.type)
        // Once you have the factoid, its own properties are always hydrated
        // Suggestions are pre-loaded — access synchronously
        console.log(station.name?.suggestions.length)          // number of alternative values
        console.log(station.name?.suggestions[0]?.value)       // first suggestion's value (typed)
        console.log(station.name?.suggestions[0]?.confidence)  // first suggestion's confidence

        // Vote on a suggestion
        await station.name?.suggestions[0]?.upvote()

        // Factoid mutations throw on error
        await station.name
            ?.upvote()
            .catch((error) => {
                console.error('Vote failed:', error)
            })

        console.log(`${station.name}`)                         // "Membury Services" (toString)

        // Mutate a value locally — does NOT call the API yet
        station.name?.setValue('Membury Service Area')
        console.log(station.name?.value)                       // "Membury Service Area" (local only)

        // Persist all dirty factoids in a single batch call
        await station
            .save()                // POST /Place/:id/factoids/batch
            .catch((error) => console.error('Save failed:', error))

        // Entity is re-assembled from server response after save
        console.log(station.name?.value)
    })      // GET /Place/uuid?depth=1


// 6. Create a new entity as the user
await session.gasStation
    .create({
        name: 'BP Services',
        operator: 'BP',
    })
    .then((newStation) => {
        console.log(newStation.id)
    })

// 7. Suggest an alternative value (does not change the current value)
await session.gasStation("id")
    .then(async (station) => {
        await station.name?.suggest('Membury Service Area', {
            notes: 'Official signage spelling',
        })

        // Suggestions are pre-loaded synchronously — no getSuggestions() needed
        console.log(station.name?.suggestions.length)          // number of alternative values
        console.log(station.name?.suggestions[0]?.value)       // suggestion value (typed)

        // Paginate through suggestions if there are many
        await station.name?.suggestions.nextPage()
        await station.name?.suggestions.requestPage(3)
    })


// 8. Return to app-only mode (de-auth the user)
const appOnly = await linx.as()
await appOnly.gasStation.list()  // Sources reference only the application

// 9. Query activity logs (requires read_own_logs or read_all_logs permission)
const logs = await session.logs({ entityId: 'some-entity-id', action: 'factoid.created' })
    .then(async (logs) => {
        console.log(logs.data!.length)                           // number of log entries
        console.log(logs.data![0]?.action)                       // 'factoid.created'
        console.log(logs.data![0]?.metadata)                     // { attribute: 'name', value: 'Shell' }
        console.log(logs.data![0]?.requestId)                    // trace all actions from one request
        console.log(logs.meta)                                   // { total, perPage, currentPage, lastPage }

        // Paginate through logs
        await logs.nextPage()
        await logs.requestPage(5)
    })

// Filter logs by category, level, etc.
const authLogs = await session.logs({ category: 'auth' })
const errorLogs = await session.logs({ level: 'error' })
