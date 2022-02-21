const bag = {
    character : null,
    questions : []
};

function renderList () {
    if (bag.character)
        $('#character_name').html (`<b>${bag.character.value} (${bag.character.id || '---'})</b>`);
    let str = '';

    for (let q of bag.questions) {
        str += `<tr>
                    <td><b>${q.probability}</b></td>
                    <td><i>${q.id || '---'}</i></td>
                    <td><i>${q.value}</i></td>
                    <td><button onclick="removeQuestionByRowId('${q.row_id}')">X</button></td>
                </tr>`;
    }
    document.getElementById ('question_list').innerHTML = str;
    console.log(bag);
}

function removeQuestionByRowId (row_id) {
    bag.questions = bag.questions.filter (q => q.row_id != row_id);
    renderList ();
};

const sep = '::';

// ui stuff
$(function() {
    function extactOrNull (id) {
        let str = $(id).val ();
        if (str)
            return str.trim ();
        return null;
    }

    function extractContentFromId (str) {
        let [a, b] = str.split(sep);
        let obj = {};
        if (!b) 
            return {id : null, value : a};
        return {id : a, value : b};
    }
    
    function makeRowID () {
        let r = Math.random () + '' + Math.random ();
        return r.replace (/\./g, '');
    }

    function replaceOrAdd (question) {
        for (let i = 0, s = bag.questions.length; i < s; i++) {
            let curr = bag.questions[i];
            let sameValue = question.value == curr.value,
                sameId = question.id == curr.id && curr.id != null;
            if (sameId || sameValue) {
                question.id = question.id || curr.id; // whoever is not null
                bag.questions.splice (i, 1);
                break;
            }
        }
        question.row_id = makeRowID ();
        bag.questions.push (question);
    }

    $('#add').click (() => {
        let chara = extactOrNull ('#character_keyword');
        let quest = extactOrNull ('#question_keyword');
        let prob = 0.01 * parseInt($('#slider').slider ('option', 'value'));

        bag.character = extractContentFromId (chara);
        replaceOrAdd ({ probability : prob, ... extractContentFromId (quest)});
        renderList ();
    });

    ////////////////////
    // slider init
    ///////////////////
    $('#slider').slider({
        animate : 'fast',
        step : 1,
        min : 0,
        max : 100,
        value: 50,
        change : function (event, ui) {
            const value = parseInt($('#slider').slider ('option', 'value'));
           $('#slider_value').text (value + '%');
        }
    });

    ///////////////////
    // basic ui logic
    //////////////////
    $('#submitAll').click (() => {
        if (!confirm('Are you sure ?'))
            return;
        const success = (response) => {
            alert(JSON.parse(response).datas); 
            console.log ('Datas sent ', bag);
        };
        const error = (err) => {
            alert('Unable to post !');
            console.error (err);
        }
        $.ajax({
            url: '/api/editor_data',
            method: "POST",
            data: bag,
            dataType: "html"
        }).done (success).fail (error);
    });

    $('#clearAll').click (() => {
        if (!confirm('Are you sure ?'))
            return;
        bag.character = null;
        bag.questions = [];
        renderList ();
        $('#question_keyword').val ('');
        $('#character_keyword').val ('');
        $('#character_name').html ('<b>----Choose a name----</b>');
    });

    $('#clear_question').click (() => {
        $('#question_keyword').val ('');
    });

    //////////////////
    // autocomplete
    //////////////////
    $('#character_keyword').autocomplete({
        source: async (request, response) => {
            const {term} = request;
            let datas = [];
            try {
                const result = await $.get ('/api/character?name=' + encodeURI (term));
                datas = result.datas.map (it => {
                    return {
                        label : `(${it.idcharacter}) - ${it.name}`, 
                        value : it.idcharacter + '::' + it.name
                    };
                });
            } catch (err) {
                console.error (err);
            } finally {
                response(datas);
            }
        }
    });
    $('#question_keyword').autocomplete({
        source: async (request, response) => {
            const {term} = request;
            let datas = [];
            try {
                const result = await $.get ('/api/question?content=' + encodeURI (term));
                datas = result.datas.map (it => {
                    return {
                        label : `(${it.idquestion}) - ${it.content}`, 
                        value : it.idquestion + '::' + it.content
                    }
                });
            } catch (err) {
                console.error (err);
            } finally {
                response(datas);
            }
        }
    });
});