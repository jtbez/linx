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
console.log(registration.userAccount.id)

// 3. Authenticate with an API key (once per session)
//    The returned client is immediately usable — app-only mode
const linx = await client.authenticate('oat_abc123...')


// 4a. Use entity methods directly (app-only mode)
//     All SDK methods return LinxResult<T> with { data, error, status }
const stationsResult = await linx.gasStation.list()       // GET /Place?depth=1&page=1&perPage=20

// Suggestions are pre-loaded in the background after entity fetch.
// Access them synchronously — no async chaining needed:
const firstStation = stationsResult.data?.[0]
const test = firstStation?.amenityFeature["atm"].suggestions[0]?.value.name
const nameValue = firstStation?.name.suggestions[0]?.value                 // Factoid<string> — typed!
const nameConfidence = firstStation?.name.suggestions[0]?.confidence       // number
// Entity-type properties are RootFactoid<HydratedEntityInstance<T>> at runtime.
// FactoidMap-typed properties (e.g., amenityFeature) are Record<string, RootFactoid<T>>.
// Pagination on suggestions:
const moreSuggestions = await firstStation?.name.suggestions.nextPage()     // fetch page 2

if (stationsResult.isError) {
    console.error(stationsResult.error)                    // Typed LinxError with status, code, details
} else {
    console.log(stationsResult.data!.length)               // Entity count on this page
    console.log(stationsResult.meta)                       // { total, perPage, currentPage, lastPage }
}

// 4b. Paginate through results
const page2 = await linx.gasStation.list({ page: 2, perPage: 10 })
if (page2.isSuccess && page2.meta!.currentPage < page2.meta!.lastPage) {
    const _page3 = await page2.nextPage()!                  // Fetch next page automatically
    const _page5 = await page2.requestPage(5)               // Jump to a specific page
}

// 4c. Fetch with custom depth (default is 1 — resolves one level of entity refs)
const deepResult = await linx.gasStation('id', { depth: 2 })
if (deepResult.isSuccess) {
    const station = deepResult.data!

    // Entity-type properties are RootFactoid<HydratedEntityInstance<T>> at runtime.
    // Use isEntityType() to discriminate at runtime:
    const containedIn = station.containedInPlace as any
    console.log(containedIn)                               // RootFactoid<Place>
    console.log(containedIn.type)                          // 'Place'
    console.log(isEntityType(containedIn.type!))           // true

    // Entity-type factoid values are HydratedEntity instances at runtime
    const place = containedIn.value                        // HydratedEntity<Place> at runtime
    console.log(place.name.current)                        // "Membury" — nested entity property

    // Entity-type factoids have suggestions just like scalar factoids
    const altPlace = containedIn.suggestions[0]?.value
    console.log(altPlace)                                  // alternative Place value

    // Vote on entity-type factoids
    await containedIn.upvote()
}

// 4d. Start interacting as a specific UserAccount
//     Sources will reference both the application and the user
const session = await linx.as(registration.userAccount.id)

// 5. Fetch and read a single entity
const stationResult = await session.gasStation("id")       // GET /Place/uuid?depth=1
if (stationResult.isSuccess) {
    const station = stationResult.data!
    console.log(station.name.current)                      // "Membury Services"
    console.log(station.name.confidence)                   // 0.95
    console.log(station.name.type)                // "Text"

    // Suggestions are pre-loaded — access synchronously
    console.log(station.name.suggestions.length)           // number of alternative values
    console.log(station.name.suggestions[0]?.value)        // first suggestion's value (typed)
    console.log(station.name.suggestions[0]?.confidence)   // first suggestion's confidence

    // Vote on a suggestion
    await station.name.suggestions[0]?.upvote()

    // Factoid mutations return LinxResult
    const voteResult = await station.name.upvote()         // POST /factoids/:id/vote
    if (voteResult.isError) {
        console.error('Vote failed:', voteResult.error)
    }

    console.log(`${station.name}`)                         // "Membury Services" (toString)

    // Mutate a value locally — does NOT call the API yet
    station.name.setValue('Membury Service Area')
    console.log(station.name.current)                      // "Membury Service Area" (local only)

    // Persist all dirty factoids in a single batch call
    const saveResult = await station.save()                // POST /Place/:id/factoids/batch
    if (saveResult.isError) {
        console.error('Save failed:', saveResult.error)
    }
    // Entity is re-assembled from server response after save
    console.log(station.name.current)                      // confirmed server value
}

// 6. Create a new entity as the user
const createResult = await session.gasStation.create({
    name: 'BP Services',
    operator: 'BP',
})
if (createResult.isSuccess) {
    console.log(createResult.data!.id)
}

// 7. Suggest an alternative value (does not change the current value)
const stationResult2 = await session.gasStation("id")
if (stationResult2.isSuccess) {
    const station = stationResult2.data!
    await station.name.suggest('Membury Service Area', {
        notes: 'Official signage spelling',
    })

    // Suggestions are pre-loaded synchronously — no getSuggestions() needed
    console.log(station.name.suggestions.length)           // number of alternative values
    console.log(station.name.suggestions[0]?.value)        // suggestion value (typed)

    // Paginate through suggestions if there are many
    const nextSuggestionPage = await station.name.suggestions.nextPage()
    const specificPage = await station.name.suggestions.requestPage(3)
}

// 8. Return to app-only mode (de-auth the user)
const appOnly = await linx.as()
await appOnly.gasStation.list()  // Sources reference only the application

// 9. Query activity logs (requires read_own_logs or read_all_logs permission)
const logs = await session.logs({ entityId: 'some-entity-id', action: 'factoid.created' })
if (logs.isSuccess) {
    console.log(logs.data!.length)                           // number of log entries
    console.log(logs.data![0]?.action)                       // 'factoid.created'
    console.log(logs.data![0]?.metadata)                     // { attribute: 'name', value: 'Shell' }
    console.log(logs.data![0]?.requestId)                    // trace all actions from one request
    console.log(logs.meta)                                   // { total, perPage, currentPage, lastPage }

    // Paginate through logs
    const nextLogPage = await logs.nextPage()
    const logPage5 = await logs.requestPage(5)
}

// Filter logs by category, level, etc.
const authLogs = await session.logs({ category: 'auth' })
const errorLogs = await session.logs({ level: 'error' })
