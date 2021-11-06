# VS Code Scoverage 

extension for viewing coverage data generated by scoverage 

## TODO
* scoverage file watchers
	* use `fs.stat()` for mtime and ctime.
* Make sure coverage is turned on when you open a file from sidebar
	* new command checks/turns on coverage for file and opens
	* can we make sure to turn it off?
	* maybe just toggle everything?
* Find "project" for each file to display as label in dropdown
	* look for `target` then go one up
		* if `target` is top, call it _root_
		* if no `target`, just use path
* Run scoverage from bloop?
	* can you and does it make sense?
	* can I use anything from metals?
* unit tests for scoverage parsing
