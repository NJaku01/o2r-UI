import React, { Component } from "react";
import { ReflexContainer, ReflexElement, ReflexSplitter } from 'react-reflex';

import CodeView from './CodeView/CodeView';
import DataView from './DataView/DataView';
import SelectFile from './SelectFile/SelectFile';
//import config from '../../../helpers/config';

class Inspect extends Component {

    componentDidMount(){
      document.title = "Inspect | ERC " + this.props.state.id + config.title; // eslint-disable-line
    }

    render() {
        const props=this.props.state;
        return (
            <ReflexContainer orientation="horizontal" style={{height: "92%"}}>
                <ReflexElement>
                    {props.codefiles != null && props.codefile != null
                    ?<SelectFile
                        value={props.codefile.filename}
                        handleChange={this.props.handleCodeChange}
                        options={props.codefiles}
                        name="codefile" />
                    :''}
                    {props.codefile != null
                    ?<CodeView
                        code={props.codefile.file.data}
                        handleTabChange={this.props.handleTabChange}
                        metadata={this.props.state.metadata} />
                    :<div>There is no data to display</div>}
                </ReflexElement>
                <ReflexSplitter propagate={true} style={{ height: "10px" }} />
                <ReflexElement>
                    {props.dataset !== undefined && Array.isArray(props.datafiles)
                    ?<SelectFile value={props.dataset.datafile} handleChange={this.props.handleDataChange} options={props.datafiles} name="dataset" />
                    : ''}
                    {props.dataset != null
                    ?<DataView
                        data={props.dataset}
                        id={props.id}
                    />
                    :<div>There is no data to display</div>}
                </ReflexElement>
            </ReflexContainer>
        );
    }
}

export default Inspect;
