# --------------- findWord function ---------------
# Function to find a word in a String.
# wordName = name of the metadata fieldname of the searched word.
# distanceAfterWord = number of characters from the beginning of wordName to the searched Name.
# searchString = String in which the wordName is.
# return wordNameReturn = returns the searched word.


def findWord(wordName, distanceAfterWord, searchString):
    lineNumber = searchString.find(wordName) + distanceAfterWord
    wordNameReturn = searchString[
        lineNumber:searchString[lineNumber:lineNumber + 200].find("'") + lineNumber]
    if wordNameReturn == "one, ":
        wordNameReturn = ""
        wordNameReturn = wordNameReturn.replace("\"", "")
    return wordNameReturn
